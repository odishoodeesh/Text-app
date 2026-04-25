import React, { useState, useEffect } from 'react';
import { 
  Send, 
  User, 
  LogOut, 
  MessageSquare, 
  Lock, 
  UserPlus, 
  LogIn, 
  Edit2, 
  Trash2, 
  X, 
  Check,
  Heart,
  Share2,
  ChevronDown,
  ChevronUp,
  Mail,
  Users,
  Settings,
  MoreVertical,
  Plus,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || "https://xwmdotzhgerirsydgbnc.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bWRvdHpoZ2VyaXJzeWRnYm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDc5MzIsImV4cCI6MjA4NzYyMzkzMn0.qFulksccdbSPx4marSQ3euFbfO1TqaosEO2rumwndjc";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Post {
  id: number;
  user_id: string;
  email: string;
  content: string;
  created_at: string;
  likes_count?: number;
  user_has_liked?: boolean;
  profiles?: Profile;
}

interface Profile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
}

interface Follow {
  follower_id: string;
  following_id: string;
}

interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Comment {
  id: number;
  post_id: number;
  user_id: string;
  parent_id: number | null;
  content: string;
  created_at: string;
  user_email?: string;
  replies?: Comment[];
}

export default function App() {
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('textpost_user_email'));
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('textpost_user_id'));
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Record<number, boolean>>({});
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  
  // New State for Social Features
  const [activeTab, setActiveTab] = useState<'feed' | 'messages' | 'profile'>('feed');
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [profileViewData, setProfileViewData] = useState<Profile | null>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [directMessages, setDirectMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [activeFollowList, setActiveFollowList] = useState<'followers' | 'following' | null>(null);
  const [viewingFollows, setViewingFollows] = useState<{followers: string[], following: string[]}>({followers: [], following: []});
  const [editProfileData, setEditProfileData] = useState({ username: '', bio: '', avatar_url: '', full_name: '' });

  useEffect(() => {
    // Check connection to backend
    fetch('/api/health')
      .then(res => res.ok ? setDbStatus('connected') : setDbStatus('error'))
      .catch(() => setDbStatus('error'));
    
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email!);
        setUserId(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserEmail(session.user.email!);
        setUserId(session.user.id);
        localStorage.setItem('textpost_user_email', session.user.email!);
        localStorage.setItem('textpost_user_id', session.user.id);
      } else {
        setUserEmail(null);
        setUserId(null);
        localStorage.removeItem('textpost_user_email');
        localStorage.removeItem('textpost_user_id');
      }
    });

    // Listen for OAuth success message from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            setUserEmail(session.user.email!);
            setUserId(session.user.id);
          }
        });
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'profile') {
      const targetId = viewingProfileId || userId;
      if (targetId) {
        fetchSpecificProfile(targetId);
        fetchFollowStats(targetId);
      }
    }
  }, [activeTab, viewingProfileId, userId, myProfile]);

  const fetchFollowStats = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .or(`follower_id.eq.${id},following_id.eq.${id}`);
      
      if (error) throw error;
      
      const stats = {
        followers: data.filter(f => f.following_id === id).map(f => f.follower_id),
        following: data.filter(f => f.follower_id === id).map(f => f.following_id)
      };
      setViewingFollows(stats);
    } catch (err) {
      console.error('Fetch follow stats error:', err);
    }
  };

  const fetchSpecificProfile = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setProfileViewData(data);
    } catch (err) {
      console.error('Fetch specific profile error:', err);
    }
  };

  const navigateToProfile = (id: string) => {
    setViewingProfileId(id);
    setActiveTab('profile');
    setIsEditingProfile(false);
  };

  useEffect(() => {
    if (selectedChatUserId) {
      fetchDirectMessages(selectedChatUserId);
    }
  }, [selectedChatUserId]);

  const fetchProfileData = async () => {
    if (!userId) return;
    try {
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        setMyProfile(profile);
        setEditProfileData({
          username: profile.username || '',
          bio: profile.bio || '',
          avatar_url: profile.avatar_url || '',
          full_name: profile.full_name || ''
        });
      }

      // Fetch Follows
      const { data: followsData } = await supabase
        .from('follows')
        .select('*')
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`);

      if (followsData) {
        setFollowers(followsData.filter(f => f.following_id === userId).map(f => f.follower_id));
        setFollowing(followsData.filter(f => f.follower_id === userId).map(f => f.following_id));
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
    }
  };

  const fetchAllProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(50);
      if (error) throw error;
      setAllProfiles(data || []);
    } catch (err) {
      console.error('All profiles fetch error:', err);
    }
  };

  const fetchDirectMessages = async (otherUserId: string) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setDirectMessages(data || []);
    } catch (err) {
      console.error('Messages fetch error:', err);
    }
  };

  const setupRealtimeMessages = () => {
    if (!userId) return;
    
    supabase
      .channel('dm-updates')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${userId}` 
      }, (payload) => {
        const newMessage = payload.new as Message;
        if (selectedChatUserId === newMessage.sender_id) {
          setDirectMessages(prev => [...prev.filter(m => m.id !== newMessage.id), newMessage]);
        }
      })
      .subscribe();
  };

  const handleFollow = async (targetUserId: string) => {
    if (!userId) return;
    const isFollowing = following.includes(targetUserId);
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', targetUserId);
        setFollowing(prev => prev.filter(id => id !== targetUserId));
      } else {
        await supabase.from('follows').insert([{ follower_id: userId, following_id: targetUserId }]);
        setFollowing(prev => [...prev, targetUserId]);
      }
    } catch (err) {
      console.error('Follow error:', err);
    }
  };

  const handleUpdateProfile = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editProfileData.username,
          bio: editProfileData.bio,
          avatar_url: editProfileData.avatar_url,
          full_name: editProfileData.full_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      await fetchProfileData();
      setIsEditingProfile(false);
    } catch (err: any) {
      setError(`Profile update failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userId || !selectedChatUserId || !newMessageText.trim()) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          sender_id: userId,
          receiver_id: selectedChatUserId,
          content: newMessageText.trim()
        }])
        .select()
        .single();

      if (error) throw error;
      setDirectMessages(prev => [...prev, data]);
      setNewMessageText('');
    } catch (err) {
      console.error('Message send error:', err);
    }
  };

  const fetchPosts = async () => {
    try {
      // Fetch posts with profiles
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*, profiles:user_id(*)')
        .order('created_at', { ascending: false });
      
      if (postsError) throw postsError;

      // Fetch likes for these posts
      const { data: likesData } = await supabase
        .from('likes')
        .select('post_id, user_id');

      const processedPosts = (postsData || []).map(post => {
        const postLikes = (likesData || []).filter(l => l.post_id === post.id);
        return {
          ...post,
          likes_count: postLikes.length,
          user_has_liked: userId ? postLikes.some(l => l.user_id === userId) : false
        };
      });

      setPosts(processedPosts);
    } catch (error: any) {
      console.error('Failed to fetch posts:', error);
      setError(`Fetch error: ${error.message}`);
    }
  };

  const fetchComments = async (postId: number) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id(username, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedComments = (data || []).map(c => ({
        ...c,
        user_email: (c.profiles as any)?.username || 'Unknown'
      }));

      setComments(prev => ({ ...prev, [postId]: formattedComments }));
    } catch (error: any) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleToggleLike = async (postId: number, hasLiked: boolean) => {
    if (!userId) return;
    try {
      if (hasLiked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId);
      } else {
        await supabase.from('likes').insert([{ post_id: postId, user_id: userId }]);
      }
      fetchPosts();
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleAddComment = async (postId: number, parentId: number | null = null) => {
    if (!newCommentContent.trim() || !userId) return;
    try {
      const { error } = await supabase
        .from('comments')
        .insert([{
          post_id: postId,
          user_id: userId,
          parent_id: parentId,
          content: newCommentContent.trim()
        }]);

      if (error) throw error;
      setNewCommentContent('');
      setReplyingToId(null);
      fetchComments(postId);
    } catch (error) {
      console.error('Comment error:', error);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
          skipBrowserRedirect: true
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, 'supabase_oauth', 'width=600,height=700');
      }
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email: loginEmail,
          password: loginPassword,
        });
        
        if (error) throw error;
        
        if (data.user && data.session) {
          localStorage.setItem('textpost_user_email', data.user.email!);
          localStorage.setItem('textpost_user_id', data.user.id);
          setUserEmail(data.user.email!);
          setUserId(data.user.id);
        } else {
          setError('Check your email for a confirmation link!');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        });
        
        if (error) throw error;
        
        if (data.user) {
          localStorage.setItem('textpost_user_email', data.user.email!);
          localStorage.setItem('textpost_user_id', data.user.id);
          setUserEmail(data.user.email!);
          setUserId(data.user.id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('textpost_user_email');
    localStorage.removeItem('textpost_user_id');
    setUserEmail(null);
    setUserId(null);
    setLoginEmail('');
    setLoginPassword('');
    setError(null);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !userId) return;

    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([{ 
          user_id: userId, 
          email: userEmail, 
          content: newPostContent.trim()
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      setPosts([data, ...posts]);
      setNewPostContent('');
      fetchPosts();
    } catch (err: any) {
      console.error('Post error:', err);
      setError(err.message || 'Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (postId: number) => {
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleEdit = async (postId: number) => {
    if (!editContent.trim() || !userId) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editContent.trim() })
        .eq('id', postId)
        .eq('user_id', userId);

      if (error) throw error;

      setEditingPostId(null);
      fetchPosts();
    } catch (err: any) {
      console.error('Edit error:', err);
      setError(`Update failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!userId || !window.confirm('Are you sure you want to delete this post?')) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', userId);

      if (error) throw error;
      fetchPosts();
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(`Delete failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-black rounded-3xl p-8 border border-zinc-800"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="text-black w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">TextPost</h1>
            <p className="text-zinc-500 text-sm mt-2">
              {isRegistering ? 'Create a new account' : 'Log in to your account'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className={`p-4 rounded-xl text-sm font-medium ${error.includes('successful') || error.includes('Check your email') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {error}
              </div>
            )}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
              <input
                type="email"
                placeholder="Email Address"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-zinc-700 transition-all"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-zinc-700 transition-all"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-white text-black py-4 rounded-full font-bold hover:bg-zinc-200 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              {isRegistering ? 'Register' : 'Login'}
            </button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-black text-zinc-500">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-black border border-zinc-800 text-white py-4 rounded-full font-bold hover:bg-zinc-900 transition-colors active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-sm text-zinc-500 hover:text-white transition-colors"
            >
              {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Register"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-sans pb-20 text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('feed')}>
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <MessageSquare className="text-black w-4 h-4" />
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:inline">TextPost</span>
            </div>
          
          <nav className="flex items-center gap-1">
            <button 
              onClick={() => setActiveTab('feed')}
              className={`p-2 sm:px-4 flex items-center gap-2 rounded-xl transition-all ${activeTab === 'feed' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Heart className={`w-5 h-5 ${activeTab === 'feed' ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline font-bold">Feed</span>
            </button>
            <button 
              onClick={() => setActiveTab('messages')}
              className={`p-2 sm:px-4 flex items-center gap-2 rounded-xl transition-all ${activeTab === 'messages' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Mail className={`w-5 h-5 ${activeTab === 'messages' ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline font-bold">Messages</span>
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`p-2 sm:px-4 flex items-center gap-2 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <User className={`w-5 h-5 ${activeTab === 'profile' ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline font-bold">Profile</span>
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleLogout}
              className="p-2 text-zinc-500 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Error Display */}
              {error && (
                <div className="mb-4 p-4 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20 flex items-center justify-between">
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400">✕</button>
                </div>
              )}

              {/* Post Form */}
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-6 mb-8 rounded-[2rem] shadow-2xl">
                <form onSubmit={handlePost}>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center shrink-0 border border-zinc-700 overflow-hidden">
                      {myProfile?.avatar_url ? (
                        <img src={myProfile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="w-6 h-6 text-zinc-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <textarea
                        placeholder="What's on your mind?!"
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        className="w-full min-h-[120px] py-2 bg-transparent text-xl text-white placeholder-zinc-600 focus:outline-none transition-all resize-none"
                      />
                      <div className="flex items-center justify-between pt-6 mt-4 border-t border-zinc-800/50">
                        <div />
                        <button
                          type="submit"
                          disabled={isLoading || !newPostContent.trim()}
                          className="flex items-center gap-2 bg-white text-black px-8 py-2.5 rounded-2xl font-bold hover:bg-zinc-200 transition-all disabled:opacity-50 shadow-lg"
                        >
                          {isLoading ? 'Posting...' : 'Share'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Posts List */}
              <div className="grid grid-cols-1 gap-6">
                {posts.map((post) => {
                  const isExpanded = expandedPosts[post.id];
                  const hasLongContent = post.content.length > 280;
                  const shouldShowMore = hasLongContent && !isExpanded;
                  const postProfile = post.profiles as any;

                  return (
                    <motion.div
                      key={post.id}
                      layout
                      className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-[2.5rem] overflow-hidden group hover:border-zinc-700/50 transition-all duration-500"
                    >
                      <div className="p-8">
                        <div className="flex gap-4 mb-6">
                          <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center shrink-0 border border-zinc-700 overflow-hidden">
                            {postProfile?.avatar_url ? (
                              <img src={postProfile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <User className="w-6 h-6 text-zinc-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span 
                                  onClick={() => navigateToProfile(post.user_id)}
                                  className="font-bold text-white text-lg tracking-tight hover:underline cursor-pointer"
                                >
                                  {postProfile?.username || post.email.split('@')[0]}
                                </span>
                                <span className="text-zinc-500 text-xs">
                                  {new Date(post.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {userId !== post.user_id && (
                                  <button 
                                    onClick={() => handleFollow(post.user_id)}
                                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${following.includes(post.user_id) ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-white text-black hover:bg-zinc-200'}`}
                                  >
                                    {following.includes(post.user_id) ? 'Following' : 'Follow'}
                                  </button>
                                )}
                                {userId === post.user_id && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingPostId(post.id); setEditContent(post.content); }} className="p-2.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-2xl">
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(post.id)} className="p-2.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-2xl">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className={`relative ${shouldShowMore ? 'max-h-40 overflow-hidden' : ''}`}>
                            <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap text-[17px] font-medium">
                              {post.content}
                            </p>
                            {shouldShowMore && <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none" />}
                          </div>

                          <div className="flex items-center justify-between pt-4">
                            <div className="flex items-center gap-6">
                              <button 
                                onClick={() => handleToggleLike(post.id, !!post.user_has_liked)}
                                className={`flex items-center gap-2 text-sm transition-all group ${post.user_has_liked ? 'text-pink-500' : 'text-zinc-500 hover:text-pink-500'}`}
                              >
                                <div className={`p-3 rounded-2xl transition-colors ${post.user_has_liked ? 'bg-pink-500/10' : 'bg-white/5 group-hover:bg-pink-500/10'}`}>
                                  <Heart className={`w-5 h-5 ${post.user_has_liked ? 'fill-current' : ''}`} />
                                </div>
                                <span className="font-bold text-base">{post.likes_count || 0}</span>
                              </button>

                              <button 
                                onClick={() => {
                                  if (activeCommentPostId === post.id) {
                                    setActiveCommentPostId(null);
                                    if (!hasLongContent) toggleExpand(post.id);
                                  } else {
                                    setActiveCommentPostId(post.id);
                                    fetchComments(post.id);
                                    if (!isExpanded) toggleExpand(post.id);
                                  }
                                }}
                                className={`flex items-center gap-2 text-sm transition-all group ${activeCommentPostId === post.id ? 'text-sky-500' : 'text-zinc-500 hover:text-sky-500'}`}
                              >
                                <div className={`p-3 rounded-2xl transition-colors ${activeCommentPostId === post.id ? 'bg-sky-500/10' : 'bg-white/5 group-hover:bg-sky-500/10'}`}>
                                  <MessageSquare className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-base">Comments</span>
                              </button>
                            </div>

                            {(hasLongContent || activeCommentPostId === post.id) && (
                              <button onClick={() => toggleExpand(post.id)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-2xl transition-all text-sm font-bold">
                                {isExpanded ? <><ChevronUp className="w-4 h-4" /> Less</> : <><ChevronDown className="w-4 h-4" /> More</>}
                              </button>
                            )}
                          </div>

                          <AnimatePresence>
                            {isExpanded && activeCommentPostId === post.id && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-6 pt-8 border-t border-zinc-800/50 mt-4 overflow-hidden">
                                <div className="flex gap-4">
                                  <div className="w-10 h-10 bg-zinc-800 rounded-xl items-center justify-center shrink-0 border border-zinc-700 hidden sm:flex">
                                    <User className="w-5 h-5 text-zinc-500" />
                                  </div>
                                  <div className="flex-1 flex gap-3">
                                    <input type="text" placeholder="Post your reply" value={newCommentContent} onChange={(e) => setNewCommentContent(e.target.value)} className="flex-1 bg-zinc-950/50 border border-zinc-800/50 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500" />
                                    <button onClick={() => handleAddComment(post.id)} disabled={!newCommentContent.trim()} className="bg-sky-500 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-sky-600 disabled:opacity-50">Reply</button>
                                  </div>
                                </div>
                                <div className="space-y-8 pl-4">
                                  {(comments[post.id] || []).filter(c => !c.parent_id).map(comment => (
                                    <div key={comment.id} className="space-y-4">
                                      <div className="flex gap-4">
                                        <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shrink-0 border border-zinc-800">
                                          <User className="w-5 h-5 text-zinc-600" />
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-bold text-white">{comment.user_email?.split('@')[0]}</span>
                                            <span className="text-zinc-600 text-xs font-medium">· {new Date(comment.created_at).toLocaleDateString()}</span>
                                          </div>
                                          <p className="text-[15px] text-zinc-300 leading-relaxed">{comment.content}</p>
                                          <button onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)} className="text-xs font-bold text-zinc-500 hover:text-sky-500 mt-3 uppercase tracking-wider">Reply</button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'messages' && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 md:grid-cols-[300px,1fr] gap-6 bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-[2.5rem] overflow-hidden min-h-[600px]"
            >
              {/* Sidebar: Chat List */}
              <div className={`border-r border-zinc-800/50 p-6 flex flex-col h-full ${selectedChatUserId ? 'hidden md:flex' : 'flex'}`}>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Mail className="w-5 h-5" /> Messages
                </h2>
                <div className="space-y-2 overflow-y-auto flex-1">
                  {allProfiles.filter(p => userId !== p.id && following.includes(p.id)).map(profile => (
                    <button
                      key={profile.id}
                      onClick={() => setSelectedChatUserId(profile.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${selectedChatUserId === profile.id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}
                    >
                      <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0 border border-zinc-700 overflow-hidden">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-5 h-5 text-zinc-500" />
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-bold truncate">{profile.username || 'Anonymous'}</div>
                        <div className="text-xs opacity-50 truncate">Click to message</div>
                      </div>
                    </button>
                  ))}
                  {following.length === 0 && (
                    <div className="text-center py-10 text-zinc-600 text-sm">
                      Follow people to start chatting
                    </div>
                  )}
                </div>
              </div>

              {/* Chat View */}
              <div className={`flex flex-col h-full ${selectedChatUserId ? 'flex' : 'hidden md:flex'}`}>
                {selectedChatUserId ? (
                  <>
                    <div className="p-6 border-b border-zinc-800/50 flex items-center gap-4">
                      <button onClick={() => setSelectedChatUserId(null)} className="md:hidden p-2 text-zinc-500 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden">
                        {allProfiles.find(p => p.id === selectedChatUserId)?.avatar_url ? (
                          <img src={allProfiles.find(p => p.id === selectedChatUserId)?.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-5 h-5 text-zinc-500" />
                        )}
                      </div>
                      <div className="font-bold text-lg">
                        {allProfiles.find(p => p.id === selectedChatUserId)?.username || 'Chat'}
                      </div>
                    </div>
                    <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                      {directMessages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-4 rounded-[1.5rem] text-[15px] leading-relaxed ${msg.sender_id === userId ? 'bg-white text-black font-medium rounded-tr-none' : 'bg-zinc-800 text-white rounded-tl-none border border-zinc-700'}`}>
                            {msg.content}
                            <div className="text-[10px] mt-1 opacity-50 text-right">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-6 border-t border-zinc-800/50 flex gap-3">
                      <input 
                        type="text" 
                        placeholder="Start a message" 
                        value={newMessageText}
                        onChange={(e) => setNewMessageText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 bg-zinc-950/50 border border-zinc-800/50 rounded-2xl px-6 py-3 text-sm focus:outline-none focus:border-white/20"
                      />
                      <button 
                        onClick={handleSendMessage}
                        disabled={!newMessageText.trim()}
                        className="p-3 bg-white text-black rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Send className="w-6 h-6" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-4">
                    <div className="w-20 h-20 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center border border-zinc-800">
                      <Mail className="w-10 h-10 text-zinc-500" />
                    </div>
                    <h3 className="text-xl font-bold">Select a message</h3>
                    <p className="text-zinc-500 max-w-xs text-sm">Choose from your existing conversations, start a new one, or just keep swimming.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              {/* Profile Card */}
              <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-[2.5rem] overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-zinc-800 to-zinc-900 flex items-start p-4">
                  {viewingProfileId && viewingProfileId !== userId && (
                    <button 
                      onClick={() => setViewingProfileId(null)}
                      className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-all"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="px-8 pb-8">
                  <div className="relative -mt-12 flex items-end justify-between mb-6">
                    <div className="w-24 h-24 bg-zinc-800 rounded-[2rem] border-4 border-black overflow-hidden flex items-center justify-center">
                      {isEditingProfile ? (
                         <div className="bg-zinc-700 w-full h-full flex items-center justify-center">
                            <Settings className="w-8 h-8 text-white animate-spin-slow" />
                         </div>
                      ) : profileViewData?.avatar_url ? (
                        <img src={profileViewData.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="w-12 h-12 text-zinc-600" />
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {(!viewingProfileId || viewingProfileId === userId) ? (
                        <button 
                          onClick={() => setIsEditingProfile(!isEditingProfile)}
                          className="px-6 py-2 bg-transparent border border-zinc-700 hover:bg-white/5 rounded-full text-sm font-bold transition-all mt-6"
                        >
                          {isEditingProfile ? 'Cancel' : 'Edit Profile'}
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleFollow(viewingProfileId)}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all mt-6 ${following.includes(viewingProfileId) ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' : 'bg-white text-black hover:bg-zinc-200'}`}
                          >
                            {following.includes(viewingProfileId) ? 'Following' : 'Follow'}
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedChatUserId(viewingProfileId);
                              setActiveTab('messages');
                            }}
                            className="px-6 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-full text-sm font-bold text-white transition-all mt-6"
                          >
                            Message
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditingProfile && (!viewingProfileId || viewingProfileId === userId) ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Username</label>
                          <input 
                            type="text" 
                            value={editProfileData.username}
                            onChange={(e) => setEditProfileData(prev => ({ ...prev, username: e.target.value }))}
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:border-white/20 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Full Name</label>
                          <input 
                            type="text" 
                            value={editProfileData.full_name}
                            onChange={(e) => setEditProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:border-white/20 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Avatar URL</label>
                        <input 
                          type="text" 
                          value={editProfileData.avatar_url}
                          onChange={(e) => setEditProfileData(prev => ({ ...prev, avatar_url: e.target.value }))}
                          className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:border-white/20 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Bio</label>
                        <textarea 
                          value={editProfileData.bio}
                          onChange={(e) => setEditProfileData(prev => ({ ...prev, bio: e.target.value }))}
                          className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:border-white/20 transition-all min-h-[100px] resize-none"
                        />
                      </div>
                      <button 
                        onClick={handleUpdateProfile}
                        disabled={isLoading}
                        className="w-full py-4 bg-white text-black rounded-2xl font-bold hover:bg-zinc-200 transition-all active:scale-[0.99] disabled:opacity-50"
                      >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold tracking-tight">{profileViewData?.full_name || profileViewData?.username || 'User'}</h2>
                      <p className="text-zinc-500 text-sm">@{profileViewData?.username || 'username'}</p>
                      <p className="text-zinc-300 mt-4 leading-relaxed max-w-lg">{profileViewData?.bio || 'No bio yet.'}</p>
                      
                      <div className="flex flex-col gap-6 mt-6">
                        <div className="flex items-center gap-6">
                          <button 
                            className="flex items-center gap-1.5 group"
                            onClick={() => setActiveFollowList('following')}
                          >
                            <span className="font-bold text-white">{viewingFollows.following.length}</span>
                            <span className="text-zinc-500 text-sm group-hover:underline">Following</span>
                          </button>
                          <button 
                            className="flex items-center gap-1.5 group"
                            onClick={() => setActiveFollowList('followers')}
                          >
                            <span className="font-bold text-white">{viewingFollows.followers.length}</span>
                            <span className="text-zinc-500 text-sm group-hover:underline">Followers</span>
                          </button>
                        </div>

                        {/* Recent Posts from this user */}
                        <div className="space-y-4 pt-8 border-t border-zinc-800/50">
                          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest pl-1">Recent Posts</h3>
                          <div className="grid grid-cols-1 gap-4">
                            {posts.filter(p => p.user_id === (viewingProfileId || userId)).slice(0, 5).map(post => (
                              <div key={post.id} className="p-4 bg-zinc-950/30 rounded-2xl border border-zinc-800/30">
                                <p className="text-zinc-300 text-sm">{post.content}</p>
                                <span className="text-[10px] text-zinc-600 mt-2 block">{new Date(post.created_at).toLocaleDateString()}</span>
                              </div>
                            ))}
                            {posts.filter(p => p.user_id === (viewingProfileId || userId)).length === 0 && (
                                <p className="text-zinc-600 text-sm italic py-4">No posts yet.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Follow List Modal/Overlay */}
      <AnimatePresence>
        {activeFollowList && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-bold capitalize">{activeFollowList}</h3>
                <button onClick={() => setActiveFollowList(null)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                   <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {(activeFollowList === 'followers' ? viewingFollows.followers : viewingFollows.following).map(id => {
                  const profile = allProfiles.find(p => p.id === id);
                  return (
                    <div 
                      key={id} 
                      className="flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-all cursor-pointer group"
                      onClick={() => {
                        navigateToProfile(id);
                        setActiveFollowList(null);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-zinc-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                           <div className="font-bold text-white group-hover:underline truncate">{profile?.username || 'Unknown'}</div>
                           <div className="text-xs text-zinc-500 truncate">{profile?.full_name || ''}</div>
                        </div>
                      </div>
                      {userId !== id && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleFollow(id); }}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${following.includes(id) ? 'text-zinc-500 border border-zinc-800' : 'bg-white text-black'}`}
                        >
                          {following.includes(id) ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>
                  );
                })}
                {(activeFollowList === 'followers' ? viewingFollows.followers : viewingFollows.following).length === 0 && (
                  <div className="text-center py-10 text-zinc-600">
                     No {activeFollowList} yet.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
