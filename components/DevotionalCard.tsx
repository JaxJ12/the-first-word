"use client";

import React from 'react';

type Devotional = {
  id: string;
  publish_date: string;
  verse_text: string;
  reference: string;
  reflection_prompt: string;
};

type DevotionalCardProps = {
  devotional: Devotional;
};

export default function DevotionalCard({ devotional }: DevotionalCardProps) {
  if (!devotional) return null;

  const dateStr = new Date(devotional.publish_date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const [weekday, ...rest] = dateStr.split(', ');
  const monthDay = rest.join(', ');

  return (
    <div className="z-10 w-full max-w-md flex flex-col items-center space-y-10 text-center mt-4">
      <header className="space-y-1">
        <p className="text-[10px] font-bold tracking-[0.4em] text-zinc-500 uppercase">{weekday}</p>
        <p className="text-xl font-light text-zinc-200">{monthDay}</p>
      </header>

      <section className="py-6 px-2">
        <h1 className="text-3xl font-serif leading-snug tracking-tight italic text-zinc-100">
          "{devotional.verse_text}"
        </h1>
        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="h-[1px] w-8 bg-blue-500/50" />
          <p className="text-xs font-medium tracking-widest text-blue-400 uppercase">
            {devotional.reference}
          </p>
          <div className="h-[1px] w-8 bg-blue-500/50" />
        </div>
      </section>

      <div className="w-full pt-6 border-t border-zinc-900 pb-2">
        <p className="text-sm leading-relaxed text-zinc-400 font-light italic">
          {devotional.reflection_prompt}
        </p>
      </div>
    </div>
  );
}
