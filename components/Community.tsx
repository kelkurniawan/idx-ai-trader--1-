
import React, { useState } from 'react';
import { User, CommunityPost, SAMPLE_IDX_STOCKS } from '../types';

const MOCK_POSTS: CommunityPost[] = [
  {
    id: '1',
    author: { id: 'u2', name: 'Rizky Trader', email: 'rizky@example.com', avatar: 'https://ui-avatars.com/api/?name=Rizky+Trader&background=0D8ABC&color=fff' },
    content: 'Just loaded up on $BBRI at support levels. The banking sector looks ready for a breakout next week given the latest earnings reports. 🚀',
    timestamp: Date.now() - 3600000,
    sentiment: 'BULLISH',
    ticker: 'BBRI',
    likes: 24,
    comments: 5
  },
  {
    id: '2',
    author: { id: 'u3', name: 'Sarah Scalps', email: 'sarah@example.com', avatar: 'https://ui-avatars.com/api/?name=Sarah+Scalps&background=e11d48&color=fff' },
    content: 'Watching $GOTO closely. Volume is drying up, expecting a flush down to 58 before any reversal. Stay safe out there!',
    timestamp: Date.now() - 7200000,
    sentiment: 'BEARISH',
    ticker: 'GOTO',
    likes: 12,
    comments: 2
  },
  {
    id: '3',
    author: { id: 'u4', name: 'Invest Indo', email: 'invest@example.com', avatar: 'https://ui-avatars.com/api/?name=Invest+Indo&background=059669&color=fff' },
    content: 'IHSG testing key resistance today. If we close above 7300, we might see a run to ATH by end of month.',
    timestamp: Date.now() - 18000000,
    likes: 45,
    comments: 12
  }
];

interface CommunityProps {
    currentUser: User | null;
}

const Community: React.FC<CommunityProps> = ({ currentUser }) => {
  const [posts, setPosts] = useState<CommunityPost[]>(MOCK_POSTS);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState<'BULLISH' | 'BEARISH' | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string>('');

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !currentUser) return;

    const newPost: CommunityPost = {
      id: Date.now().toString(),
      author: currentUser,
      content: newPostContent,
      timestamp: Date.now(),
      sentiment: selectedSentiment || undefined,
      ticker: selectedTicker || undefined,
      likes: 0,
      comments: 0
    };

    setPosts([newPost, ...posts]);
    setNewPostContent('');
    setSelectedSentiment(null);
    setSelectedTicker('');
  };

  const handleLike = (id: string) => {
    setPosts(posts.map(p => {
        if (p.id === id) {
            return {
                ...p,
                likes: p.isLiked ? p.likes - 1 : p.likes + 1,
                isLiked: !p.isLiked
            };
        }
        return p;
    }));
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor((Date.now() - ms) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(ms).toLocaleDateString();
  };

  return (
    <div className="animate-fade-in pb-12">
       <div className="flex items-center gap-4 mb-8">
         <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
         </div>
         <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Trading Community</h2>
            <p className="text-slate-500 font-medium">Join the conversation with {1200 + posts.length} traders</p>
         </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* MAIN FEED */}
        <div className="flex-1 space-y-6">
            {/* Create Post Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex gap-4">
                    <img src={currentUser?.avatar} alt={currentUser?.name} className="w-12 h-12 rounded-xl bg-slate-200" />
                    <div className="flex-1">
                        <form onSubmit={handlePostSubmit}>
                            <textarea 
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                placeholder="What's your market outlook today?" 
                                className="w-full h-24 bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-medium focus:outline-none focus:border-indigo-500 resize-none transition-all"
                            ></textarea>
                            
                            <div className="flex flex-wrap items-center gap-3 mt-4">
                                <div className="flex bg-slate-50 rounded-lg p-1 border border-slate-100">
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedSentiment(selectedSentiment === 'BULLISH' ? null : 'BULLISH')}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${selectedSentiment === 'BULLISH' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-emerald-500'}`}
                                    >
                                        BULLISH
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedSentiment(selectedSentiment === 'BEARISH' ? null : 'BEARISH')}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${selectedSentiment === 'BEARISH' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-400 hover:text-red-500'}`}
                                    >
                                        BEARISH
                                    </button>
                                </div>

                                <select 
                                    value={selectedTicker} 
                                    onChange={(e) => setSelectedTicker(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="">Tag Asset (Optional)</option>
                                    {SAMPLE_IDX_STOCKS.map(s => <option key={s.ticker} value={s.ticker}>${s.ticker}</option>)}
                                </select>

                                <button 
                                    type="submit" 
                                    disabled={!newPostContent.trim()}
                                    className="ml-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-lg shadow-indigo-100 transition-all text-sm"
                                >
                                    Post
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Posts Stream */}
            <div className="space-y-4">
                {posts.map(post => (
                    <div key={post.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-xl bg-slate-200" />
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">{post.author.name}</h4>
                                    <p className="text-xs text-slate-400 font-medium">{formatTime(post.timestamp)}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {post.sentiment && (
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${post.sentiment === 'BULLISH' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        {post.sentiment}
                                    </span>
                                )}
                                {post.ticker && (
                                    <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                        ${post.ticker}
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <p className="text-slate-600 text-sm leading-relaxed mb-6 whitespace-pre-line">{post.content}</p>
                        
                        <div className="flex items-center gap-6 border-t border-slate-50 pt-4">
                            <button 
                                onClick={() => handleLike(post.id)}
                                className={`flex items-center gap-2 text-sm font-bold transition-colors ${post.isLiked ? 'text-rose-500' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <svg className="w-5 h-5" fill={post.isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                {post.likes}
                            </button>
                            <button className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                {post.comments}
                            </button>
                            <button className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors ml-auto">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* SIDEBAR WIDGETS */}
        <div className="w-full lg:w-80 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-4">Trending Tickers</h3>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-slate-700 group-hover:text-indigo-600">$BBCA</span>
                            <span className="text-xs text-slate-400">1.2k posts</span>
                        </div>
                        <span className="text-emerald-500 font-bold text-xs">+2.4%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-slate-700 group-hover:text-indigo-600">$GOTO</span>
                            <span className="text-xs text-slate-400">856 posts</span>
                        </div>
                        <span className="text-red-500 font-bold text-xs">-1.1%</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-slate-700 group-hover:text-indigo-600">$ASII</span>
                            <span className="text-xs text-slate-400">420 posts</span>
                        </div>
                        <span className="text-emerald-500 font-bold text-xs">+0.8%</span>
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200">
                <h3 className="font-black text-lg mb-2">Invite Friends</h3>
                <p className="text-indigo-200 text-xs mb-6">Grow your circle. Earn pro badges when your friends join the community.</p>
                <button className="w-full py-3 bg-white text-indigo-700 font-black rounded-xl text-xs hover:bg-indigo-50 transition-colors">
                    Copy Invite Link
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-4">Top Contributors</h3>
                <div className="space-y-4">
                     {[1,2,3].map(i => (
                         <div key={i} className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                 {['AB', 'CD', 'EF'][i-1]}
                             </div>
                             <div className="flex-1">
                                 <h4 className="text-xs font-bold text-slate-800">Trader_{i}</h4>
                                 <p className="text-[10px] text-slate-400">124 helpful signals</p>
                             </div>
                             <button className="px-2 py-1 bg-slate-50 text-indigo-600 text-[10px] font-bold rounded-lg hover:bg-indigo-50 border border-slate-100">Follow</button>
                         </div>
                     ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Community;
