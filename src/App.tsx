import React, { useState, useEffect } from 'react';
import { Send, User, LogOut, MessageSquare, Lock, UserPlus, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Post {
  id: number;
  username: string;
  content: string;
  created_at: string;
}

export default function App() {
  const [username, setUsername] = useState<string | null>(localStorage.getItem('textpost_user'));
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginUsername, setLoginUsername] = useState('Ashur@admin.com');
  const [loginPassword, setLoginPassword] = useState('12345678');
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (username) {
      fetchPosts();
    }
  }, [username]);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const endpoint = isRegistering ? '/api/register' : '/api/login';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (isRegistering) {
          setIsRegistering(false);
          setError('Registration successful! Please log in.');
        } else {
          localStorage.setItem('textpost_user', data.username);
          setUsername(data.username);
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Something went wrong');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('textpost_user');
    setUsername(null);
    setLoginUsername('');
    setLoginPassword('');
    setError(null);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !username) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, content: newPostContent.trim() }),
      });
      if (response.ok) {
        setNewPostContent('');
        fetchPosts();
      }
    } catch (error) {
      console.error('Failed to post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!username) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8 border border-black/5"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-4">
              <MessageSquare className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900">TextPost</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {isRegistering ? 'Create a new account' : 'Log in to your account'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className={`p-3 rounded-xl text-sm ${error.includes('successful') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {error}
              </div>
            )}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-black text-white py-4 rounded-2xl font-medium hover:bg-zinc-800 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              {isRegistering ? 'Register' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-sm text-zinc-500 hover:text-black transition-colors"
            >
              {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Register"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <MessageSquare className="text-white w-4 h-4" />
            </div>
            <span className="font-semibold text-zinc-900">TextPost</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-full">
              <User className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-700">{username}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Post Form */}
        <div className="bg-white rounded-3xl shadow-sm p-6 border border-black/5 mb-8">
          <form onSubmit={handlePost}>
            <textarea
              placeholder="What's on your mind?"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="w-full min-h-[120px] p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all resize-none mb-4"
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !newPostContent.trim()}
                className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isLoading ? 'Posting...' : (
                  <>
                    <span>Post</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-zinc-500" />
                    </div>
                    <span className="font-semibold text-zinc-900">{post.username}</span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>

          {posts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-zinc-400">No posts yet. Be the first to share something!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
