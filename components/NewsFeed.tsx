
import React from 'react';
import { NewsItem } from '../types';

interface NewsFeedProps {
  news: NewsItem[];
  isLoading: boolean;
}

const NewsFeed: React.FC<NewsFeedProps> = ({ news, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-32 bg-slate-800 rounded mb-4"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-800/20 border border-slate-700/50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-3 w-20 bg-slate-700 rounded"></div>
              <div className="h-3 w-16 bg-slate-700 rounded"></div>
            </div>
            <div className="h-5 w-full bg-slate-700 rounded"></div>
            <div className="h-4 w-2/3 bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="bg-slate-800/20 border border-slate-700 border-dashed rounded-xl p-8 text-center">
        <p className="text-slate-500 italic">No recent news found for this ticker.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-slate-200 font-bold flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          Latest News
        </h3>
      </div>
      <div className="grid gap-4">
        {news.map((item, idx) => (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/60 hover:border-emerald-500/30 transition-all"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80 bg-emerald-500/10 px-2 py-0.5 rounded">
                {item.source}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {item.publishedAt || 'Recent'}
              </span>
            </div>
            <h4 className="text-slate-200 font-semibold text-sm mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">
              {item.title}
            </h4>
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {item.snippet}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;
