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

type Verse = {
  book_id: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
};

type Comment = {
  id: string;
  user_name: string;
  content: string;
  created_at: string;
};

export default function BibleReader() {
  const { session, userProfile, friendUsernames } = useAuth();
  
  const [selectedBook, setSelectedBook] = useState("John");
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Verse Commenting State
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [verseComments, setVerseComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Map of verse number to comment count for quick UI indicators
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchChapter();
  }, [selectedBook, selectedChapter]);

  const fetchChapter = async () => {
    setIsLoading(true);
    setSelectedVerse(null); // Reset selection on new chapter
    setCommentCounts({});
    
    try {
      const res = await fetch(`https://bible-api.com/${selectedBook}+${selectedChapter}`);
      if (!res.ok) throw new Error("Could not find chapter");
      const data = await res.json();
      setVerses(data.verses || []);
      
      // Fetch comment counts for this chapter from supabase
      if (data.verses && data.verses.length > 0) {
        const { data: comments } = await supabase
          .from('verse_notes')
          .select('reference')
          .like('reference', `${selectedBook} ${selectedChapter}:%`);
          
        if (comments) {
          const counts: Record<number, number> = {};
          comments.forEach(c => {
            // Extract verse number from 'John 1:5'
            const parts = c.reference.split(':');
            const verseNum = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(verseNum)) {
              counts[verseNum] = (counts[verseNum] || 0) + 1;
            }
          });
          setCommentCounts(counts);
        }
      }
    } catch (err) {
      setVerses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerseClick = async (verse: Verse) => {
    setSelectedVerse(verse);
    setNewComment("");
    
    // Fetch comments for this specific verse
    const reference = `${verse.book_name} ${verse.chapter}:${verse.verse}`;
    const { data } = await supabase
      .from('verse_notes')
      .select('id, user_name, content, created_at')
      .eq('reference', reference)
      .order('created_at', { ascending: false });
      
    if (data) {
      // Filter to only show friends' comments and your own
      const visibleComments = data.filter(c => 
        friendUsernames.includes(c.user_name) || c.user_name === userProfile?.username
      );
      setVerseComments(visibleComments);
    } else {
      setVerseComments([]);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVerse || !newComment.trim() || !userProfile || !session) return;
    
    setIsSubmitting(true);
    const reference = `${selectedVerse.book_name} ${selectedVerse.chapter}:${selectedVerse.verse}`;
    
    const { error } = await supabase.from('verse_notes').insert({
      user_id: session.user.id,
      reference: reference,
      user_name: userProfile.username,
      content: newComment.trim()
    });
    
    if (!error) {
      setNewComment("");
      // Refresh the comments view for this verse
      handleVerseClick(selectedVerse);
      
      // Increment local count indicator
      setCommentCounts(prev => ({
        ...prev,
        [selectedVerse.verse]: (prev[selectedVerse.verse] || 0) + 1
      }));
    } else {
      alert("Failed to post comment.");
    }
    setIsSubmitting(false);
  };

  const handlePrevChapter = () => setSelectedChapter(prev => Math.max(1, prev - 1));
  const handleNextChapter = () => setSelectedChapter(prev => prev + 1);

  return (
    <div className="w-full flex flex-col md:flex-row pb-24 z-10 px-4 h-full gap-6">
      <div className={`w-full ${selectedVerse ? 'md:w-2/3 hidden md:block' : 'w-full'}`}>
        <div className="sticky top-0 bg-[#050505]/95 backdrop-blur-xl z-20 py-4 border-b border-zinc-900/50 flex flex-col items-center gap-4">
          <div className="flex w-full items-center justify-between gap-2 max-w-sm">
            <select 
              value={selectedBook}
              onChange={(e) => {
                setSelectedBook(e.target.value);
                setSelectedChapter(1);
              }}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              {BIBLE_BOOKS.map(book => (
                <option key={book} value={book}>{book}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevChapter}
                disabled={selectedChapter <= 1 || isLoading}
                className="bg-zinc-900 border border-zinc-800 rounded-lg w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-50"
              >
                ←
              </button>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-12 h-10 flex items-center justify-center text-sm font-bold text-white">
                {selectedChapter}
              </div>
              <button 
                onClick={handleNextChapter}
                disabled={isLoading || verses.length === 0}
                className="bg-zinc-900 border border-zinc-800 rounded-lg w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-50"
              >
                →
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 relative min-h-[50vh] max-w-2xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
          ) : verses.length === 0 ? (
            <div className="text-center text-zinc-500 italic py-10">
              Chapter not found or end of book reached.
            </div>
          ) : (
            <div className="text-lg leading-[2.2] text-zinc-300 font-serif pb-20">
              {verses.map(verse => {
                const isSelected = selectedVerse?.verse === verse.verse;
                const hasComments = commentCounts[verse.verse] > 0;
                
                return (
                  <span 
                    key={verse.verse} 
                    onClick={() => handleVerseClick(verse)}
                    className={`inline cursor-pointer transition-all duration-300 rounded pb-1 px-1 ${
                      isSelected 
                        ? 'bg-blue-900/40 text-blue-100 ring-1 ring-blue-500/50' 
                        : 'hover:bg-zinc-800/50'
                    }`}
                  >
                    <sup className={`text-[10px] font-sans font-bold select-none mr-1 ${hasComments ? 'text-orange-400' : 'text-blue-400/60'}`}>
                      {verse.verse}
                    </sup>
                    {verse.text.replace(/\n/g, ' ')}{' '}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Side Panel for Comments */}
      {selectedVerse && (
        <div className="fixed md:sticky top-0 md:top-24 left-0 w-full md:w-1/3 h-[100dvh] md:h-[calc(100vh-100px)] bg-zinc-950 md:bg-transparent border-none md:border-l border-zinc-900 z-40 p-6 flex flex-col md:rounded-none overflow-y-auto">
          
          <button 
            className="md:hidden absolute top-6 right-6 w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center top-6 text-zinc-400 hover:text-white"
            onClick={() => setSelectedVerse(null)}
          >
            ✕
          </button>
          
          <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4">
            Notes & Thoughts
          </h2>
          
          <div className="mb-6 pb-6 border-b border-zinc-900">
            <h3 className="text-xl font-serif text-blue-300 mb-2">
              {selectedVerse.book_name} {selectedVerse.chapter}:{selectedVerse.verse}
            </h3>
            <p className="text-sm italic text-zinc-400 leading-relaxed font-serif">
              "{selectedVerse.text.trim()}"
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {verseComments.length === 0 ? (
              <p className="text-xs text-zinc-600 italic text-center py-10 block w-full">
                No friends have commented on this verse yet. Be the first!
              </p>
            ) : (
              verseComments.map(comment => (
                <div key={comment.id} className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-bold text-blue-400">{comment.user_name}</p>
                    <p className="text-[9px] text-zinc-600">
                      {new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-300 font-light leading-relaxed">{comment.content}</p>
                </div>
              ))
            )}
          </div>
          
          <form onSubmit={submitComment} className="mt-auto">
            <div className="relative">
              <textarea 
                placeholder="Share your thought on this verse..." 
                value={newComment} 
                onChange={(e) => setNewComment(e.target.value)} 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors resize-none h-16 pr-14" 
                required 
              />
              <button 
                type="submit" 
                disabled={isSubmitting || !newComment.trim()} 
                className="absolute right-2 bottom-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] px-3 py-1.5 rounded transition-colors disabled:opacity-50"
              >
                {isSubmitting ? '...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
