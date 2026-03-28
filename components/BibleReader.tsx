"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const BIBLE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", 
  "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", 
  "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", 
  "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", 
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", 
  "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", 
  "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", 
  "1 John", "2 John", "3 John", "Jude", "Revelation"
];

const TRANSLATIONS = [
  { id: 'web', name: 'World English Bible (WEB)' },
  { id: 'kjv', name: 'King James Version (KJV)' },
  { id: 'bbe', name: 'Bible in Basic English (BBE)' },
  { id: 'oeb-us', name: 'Open English Bible (US)' }
];

const HIGHLIGHT_COLORS = [
  { id: 'none', hex: 'transparent', label: 'None' },
  { id: 'yellow', hex: 'rgba(234, 179, 8, 0.3)', label: 'Yellow' },
  { id: 'green', hex: 'rgba(34, 197, 94, 0.3)', label: 'Green' },
  { id: 'blue', hex: 'rgba(59, 130, 246, 0.3)', label: 'Blue' },
  { id: 'purple', hex: 'rgba(168, 85, 247, 0.3)', label: 'Purple' }
];

type Verse = {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
};

type VerseNote = {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  is_public: boolean;
  highlight_color: string | null;
  created_at: string;
};

export default function BibleReader() {
  const { session, userProfile, friendUsernames } = useAuth();
  
  // Reading State
  const [selectedBook, setSelectedBook] = useState("John");
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedTranslation, setSelectedTranslation] = useState("web");
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Chapter Metadata State
  const [myHighlights, setMyHighlights] = useState<Record<number, string>>({});
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});

  // Side Panel State
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [activeTab, setActiveTab] = useState<'annotate'|'community'|'study'>('annotate');
  
  // Annotation Form State
  const [myExistingNoteId, setMyExistingNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteIsPublic, setNoteIsPublic] = useState(false);
  const [noteColor, setNoteColor] = useState("none");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // External Data State
  const [communityNotes, setCommunityNotes] = useState<VerseNote[]>([]);
  const [crossRefs, setCrossRefs] = useState<any[]>([]);
  const [isStudying, setIsStudying] = useState(false);

  useEffect(() => {
    fetchChapter();
  }, [selectedBook, selectedChapter, selectedTranslation]);

  const fetchChapter = async () => {
    setIsLoading(true);
    setSelectedVerse(null);
    setCommentCounts({});
    setMyHighlights({});
    
    try {
      const res = await fetch(`https://bible-api.com/${selectedBook}+${selectedChapter}?translation=${selectedTranslation}`);
      if (!res.ok) throw new Error("Could not find chapter");
      const data = await res.json();
      setVerses(data.verses || []);
      
      // Fetch chapter annotations (for comment counts and my highlights)
      if (data.verses && data.verses.length > 0 && session) {
        const { data: notes } = await supabase
          .from('verse_notes')
          .select('reference, user_id, highlight_color')
          .like('reference', `${selectedBook} ${selectedChapter}:%`);
          
        if (notes) {
          const counts: Record<number, number> = {};
          const highlights: Record<number, string> = {};
          
          notes.forEach(note => {
            const parts = note.reference.split(':');
            const verseNum = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(verseNum)) {
              if (note.user_id !== session.user.id) {
                // Anyone else's note counts towards the indicator if it has content
                counts[verseNum] = (counts[verseNum] || 0) + 1;
              } else {
                // My note / highlight
                if (note.highlight_color && note.highlight_color !== 'none') {
                  highlights[verseNum] = note.highlight_color;
                }
              }
            }
          });
          
          setCommentCounts(counts);
          setMyHighlights(highlights);
        }
      }
    } catch (err) {
      setVerses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerseClick = async (verse: Verse) => {
    if (!session) {
      alert("Please log in to annotate or view community study notes.");
      return;
    }
    
    setSelectedVerse(verse);
    setActiveTab('annotate');
    setMyExistingNoteId(null);
    setNoteContent("");
    setNoteIsPublic(false);
    setNoteColor("none");
    setCommunityNotes([]);
    setCrossRefs([]);
    
    const reference = `${verse.book_name} ${verse.chapter}:${verse.verse}`;
    
    // 1. Fetch all notes for this verse
    const { data } = await supabase
      .from('verse_notes')
      .select('*')
      .eq('reference', reference)
      .order('created_at', { ascending: false });
      
    if (data) {
      // Find my note
      const myNote = data.find(d => d.user_id === session?.user.id);
      if (myNote) {
        setMyExistingNoteId(myNote.id);
        setNoteContent(myNote.content || "");
        setNoteIsPublic(myNote.is_public || false);
        setNoteColor(myNote.highlight_color || "none");
      }
      
      // Find community & friend notes
      const visibleNotes = data.filter(d => 
        d.user_id !== session?.user.id && 
        (d.is_public === true || friendUsernames.includes(d.user_name))
      );
      setCommunityNotes(visibleNotes);
    }
  };

  const saveAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVerse || !userProfile || !session) return;
    
    setIsSubmitting(true);
    const reference = `${selectedVerse.book_name} ${selectedVerse.chapter}:${selectedVerse.verse}`;
    const payload = {
      user_id: session.user.id,
      user_name: userProfile.username,
      reference,
      content: noteContent.trim(),
      is_public: noteIsPublic,
      highlight_color: noteColor
    };

    let error;
    if (myExistingNoteId) {
      const res = await supabase.from('verse_notes').update(payload).eq('id', myExistingNoteId);
      error = res.error;
    } else {
      const res = await supabase.from('verse_notes').insert(payload);
      error = res.error;
    }
    
    if (!error) {
      // Refresh my highlights inline
      setMyHighlights(prev => ({
        ...prev,
        [selectedVerse.verse]: noteColor
      }));
      alert("Annotation saved!");
    } else {
      console.error(error);
      alert("Failed to save annotation. Did you update the Supabase table?");
    }
    setIsSubmitting(false);
  };

  const fetchStudyContext = async () => {
    setActiveTab('study');
    if (!selectedVerse || crossRefs.length > 0) return;
    
    setIsStudying(true);
    
    const referenceStr = `${selectedVerse.book_name} ${selectedVerse.chapter}:${selectedVerse.verse}`;
    
    // Fetch directly from our new cross_references table
    const { data, error } = await supabase
      .from('cross_references')
      .select('target_verse, votes')
      .eq('source_verse', referenceStr)
      .order('votes', { ascending: false })
      .limit(5);
      
    if (data && data.length > 0) {
      // Map them into UI readable format
      const mappedRefs = data.map(d => ({
        reference: d.target_verse,
        text: `View related passage: ${d.target_verse}`,
        book_name: d.target_verse.split(/ (?=\d+:\d+)/)[0],
        chapter: parseInt(d.target_verse.split(/ (?=\d+:\d+)/)[1]?.split(':')[0] || '1', 10)
      }));
      setCrossRefs(mappedRefs);
    } else {
      setCrossRefs([]);
    }
    
    setIsStudying(false);
  };

  const handlePrevChapter = () => setSelectedChapter(prev => Math.max(1, prev - 1));
  const handleNextChapter = () => setSelectedChapter(prev => prev + 1);

  return (
    <div className="w-full flex flex-col md:flex-row pb-24 z-10 px-4 h-full gap-6 relative">
      
      {/* SCRIPTURE VIEWER */}
      <div className={`w-full transition-all duration-300 ${selectedVerse ? 'md:w-[60%] pb-[60vh] md:pb-0' : 'w-full'}`}>
        <div className="sticky top-0 bg-[#050505]/95 backdrop-blur-xl z-20 py-4 border-b border-zinc-900/50 flex flex-col items-center gap-3">
          
          <div className="flex w-full items-center justify-between gap-2 max-w-lg flex-wrap md:flex-nowrap">
            {/* Version Switcher */}
            <select 
              value={selectedTranslation}
              onChange={(e) => setSelectedTranslation(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-300 focus:outline-none focus:border-blue-500 w-full md:w-auto"
            >
              {TRANSLATIONS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            {/* Book Selector */}
            <select 
              value={selectedBook}
              onChange={(e) => { setSelectedBook(e.target.value); setSelectedChapter(1); }}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              {BIBLE_BOOKS.map(book => <option key={book} value={book}>{book}</option>)}
            </select>

            {/* Chapter Paginator */}
            <div className="flex items-center gap-1">
              <button onClick={handlePrevChapter} disabled={selectedChapter <= 1 || isLoading} className="bg-zinc-900 border border-zinc-800 rounded-lg w-10 h-9 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-50">→</button>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-10 h-9 flex items-center justify-center text-sm font-bold text-white">{selectedChapter}</div>
              <button onClick={handleNextChapter} disabled={isLoading || verses.length === 0} className="bg-zinc-900 border border-zinc-800 rounded-lg w-10 h-9 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-50">→</button>
            </div>
          </div>
        </div>

        <div className="mt-8 relative min-h-[50vh] max-w-2xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
          ) : verses.length === 0 ? (
            <div className="text-center text-zinc-500 italic py-10">Chapter not found in this translation.</div>
          ) : (
            <div className="text-lg leading-[2.2] text-zinc-300 font-serif pb-20">
              {verses.map(verse => {
                const isSelected = selectedVerse?.verse === verse.verse;
                const communityCount = commentCounts[verse.verse] || 0;
                const highlightHex = HIGHLIGHT_COLORS.find(c => c.id === myHighlights[verse.verse])?.hex || 'transparent';
                
                return (
                  <span 
                    key={verse.verse} 
                    onClick={() => handleVerseClick(verse)}
                    style={{ backgroundColor: highlightHex !== 'transparent' && !isSelected ? highlightHex : undefined }}
                    className={`inline cursor-pointer transition-all duration-300 rounded pb-1 px-1 ${
                      isSelected ? 'bg-blue-900/40 text-blue-100 ring-1 ring-blue-500/50' : 'hover:bg-zinc-800/50'
                    }`}
                  >
                    <sup className="text-[10px] font-sans font-bold select-none mr-1 text-zinc-500">
                      {verse.verse}
                    </sup>
                    <span style={{ borderBottom: communityCount > 0 && !isSelected ? '1px dashed rgba(156, 163, 175, 0.5)' : 'none' }}>
                      {verse.text.replace(/\n/g, ' ')}{' '}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MOBILE BOTTOM DRAWER & DESKTOP SIDE PANEL */}
      {selectedVerse && (
        <>
          {/* Overlay to dim background slightly on mobile when drawer is up */}
          <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSelectedVerse(null)} />
          
          <div className="fixed bottom-0 left-0 w-full h-[60dvh] bg-zinc-950 md:sticky md:top-24 md:w-[40%] md:h-[calc(100vh-100px)] md:bg-zinc-900/20 md:border md:rounded-2xl border-t border-zinc-900 z-40 flex flex-col shadow-2xl backdrop-blur-3xl overflow-hidden rounded-t-3xl">
            
            <div className="bg-zinc-900/80 p-4 border-b border-zinc-800 flex justify-between items-start pt-6 md:pt-4">
              {/* Mobile grab handle */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-zinc-700 rounded-full md:hidden" />
              
              <div>
                <h3 className="text-lg font-serif text-blue-300">
                  {selectedVerse.book_name} {selectedVerse.chapter}:{selectedVerse.verse}
                </h3>
                <p className="text-xs italic text-zinc-400 mt-1 font-serif line-clamp-2">
                  "{selectedVerse.text.trim()}"
                </p>
              </div>
              <button className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors flex-shrink-0" onClick={() => setSelectedVerse(null)}>✕</button>
            </div>

            <div className="flex border-b border-zinc-800 bg-zinc-900/40 flex-shrink-0">
              <button onClick={() => setActiveTab('annotate')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'annotate' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>My Annotations</button>
              <button onClick={() => setActiveTab('community')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'community' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>Community ({communityNotes.length})</button>
              <button onClick={fetchStudyContext} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'study' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>Study</button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-zinc-950/50 flex flex-col relative pb-safe">
              
              {/* ANNOTATE TAB */}
              {activeTab === 'annotate' && (
                <form onSubmit={saveAnnotation} className="flex flex-col h-full absolute inset-0">
                  <div className="p-4 md:p-6 flex-1 overflow-y-auto">
                    <div className="mb-6">
                      <label className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-3 block">Highlight Color</label>
                      <div className="flex gap-3">
                        {HIGHLIGHT_COLORS.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setNoteColor(c.id)}
                            style={{ backgroundColor: c.id === 'none' ? '#18181b' : c.hex.replace('0.3', '1') }}
                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${noteColor === c.id ? 'border-white scale-110' : 'border-zinc-700'}`}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-2 block">My Notes</label>
                      <textarea 
                        placeholder="Reflect on this verse..." 
                        value={noteContent} 
                        onChange={(e) => setNoteContent(e.target.value)} 
                        className="w-full min-h-[100px] bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors resize-none mb-4" 
                      />
                    </div>
                  </div>
                  
                  {/* Explicitly pinned footer for Save Button */}
                  <div className="bg-zinc-900 border-t border-zinc-800 p-4 flex items-center justify-between sticky bottom-0 z-10 w-full mb-[50px] md:mb-0">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={noteIsPublic} 
                        onChange={(e) => setNoteIsPublic(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900 bg-zinc-900"
                      />
                      <span className="text-xs text-zinc-400 font-medium">Make Public</span>
                    </label>
                    <button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-8 py-2.5 rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/20"
                    >
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              )}

              {/* COMMUNITY TAB */}
              {activeTab === 'community' && (
                <div className="space-y-4 p-4 md:p-6 pb-20">
                  {communityNotes.length === 0 ? (
                    <p className="text-xs text-zinc-600 italic text-center py-10 mt-10">No public or friend notes for this verse.</p>
                  ) : (
                    communityNotes.map(note => {
                      const isFriend = friendUsernames.includes(note.user_name);
                      return (
                        <div key={note.id} className={`p-4 rounded-xl border ${isFriend ? 'bg-blue-900/10 border-blue-500/20' : 'bg-zinc-900/40 border-zinc-800/50'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <p className={`text-xs font-bold ${isFriend ? 'text-blue-400' : 'text-zinc-300'}`}>
                              {note.user_name} {isFriend && <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded ml-1 uppercase">Friend</span>}
                            </p>
                            <p className="text-[9px] text-zinc-600">{new Date(note.created_at).toLocaleDateString()}</p>
                          </div>
                          <p className="text-sm text-zinc-300 font-light leading-relaxed">{note.content || <span className="italic text-zinc-600">Highlighted only.</span>}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* STUDY TAB */}
              {activeTab === 'study' && (
                <div className="space-y-4 p-4 md:p-6 pb-20">
                  <p className="text-xs text-zinc-500 mb-4 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                    <strong className="text-zinc-300 tracking-widest uppercase text-[10px] block mb-1">Treasury Cross-References</strong>
                    Verses related structurally and topically to this passage.
                  </p>
                  {isStudying ? (
                    <div className="flex justify-center py-10"><div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"/></div>
                  ) : crossRefs.length === 0 ? (
                    <p className="text-xs text-zinc-600 italic text-center py-5">No cross-references found for this verse.</p>
                  ) : (
                    crossRefs.map((ref, idx) => (
                      <div key={idx} className="bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/50 hover:bg-zinc-800/40 transition-colors cursor-pointer" onClick={() => { setSelectedBook(ref.book_name); setSelectedChapter(ref.chapter); }}>
                        <p className="text-[10px] font-bold text-orange-400 mb-1">{ref.reference}</p>
                        <p className="text-xs text-zinc-400 font-serif italic line-clamp-3">"{ref.text.trim()}"</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
