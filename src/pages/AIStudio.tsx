import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Video, Image, Music, Mic, FileText, Wand2, Play,
  Upload, Zap, Loader2, Copy, Check, ArrowLeft, Download,
  Film, Clapperboard, Tv, Newspaper, Trophy, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navbar from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const aiTools = [
  {
    id: 'video',
    icon: Video,
    title: 'Video Generator',
    description: 'Generate entire videos from text prompts',
    color: 'from-primary to-gold-light',
    premium: true,
    placeholder: 'Describe the video you want to create... (e.g., "A cinematic trailer for a sci-fi movie about space exploration")'
  },
  {
    id: 'script',
    icon: FileText,
    title: 'Script Writer',
    description: 'AI-generated scripts and screenplays',
    color: 'from-orange-500 to-amber-500',
    premium: false,
    placeholder: 'Describe your video concept... (e.g., "A 5-minute documentary about climate change")'
  },
  {
    id: 'thumbnail',
    icon: Image,
    title: 'Thumbnail Creator',
    description: 'AI-powered thumbnails that convert',
    color: 'from-blue-500 to-cyan-500',
    premium: false,
    placeholder: 'Describe your thumbnail... (e.g., "Eye-catching thumbnail for a cooking video")'
  },
  {
    id: 'music',
    icon: Music,
    title: 'Background Music',
    description: 'Generate royalty-free music suggestions',
    color: 'from-purple-500 to-pink-500',
    premium: false,
    placeholder: 'Describe the mood and style... (e.g., "Upbeat electronic music for a tech review")'
  },
  {
    id: 'voiceover',
    icon: Mic,
    title: 'Voice-Over Script',
    description: 'Professional narration scripts',
    color: 'from-green-500 to-emerald-500',
    premium: true,
    placeholder: 'Describe the video content... (e.g., "Voice-over for a travel vlog about Japan")'
  },
  {
    id: 'enhance',
    icon: Wand2,
    title: 'Video Enhancer',
    description: 'Upscale and improve video quality',
    color: 'from-red-500 to-rose-500',
    premium: false,
    placeholder: 'Describe enhancements needed... (e.g., "Color correction for outdoor footage")'
  },
];

const contentTypes = [
  { id: 'movie', icon: Film, label: 'Full Movie' },
  { id: 'documentary', icon: Clapperboard, label: 'Documentary' },
  { id: 'show', icon: Tv, label: 'TV Show' },
  { id: 'news', icon: Newspaper, label: 'News Clip' },
  { id: 'sports', icon: Trophy, label: 'Sports Highlights' },
];

const styles = [
  'Cinematic', 'Documentary', 'Animation', 'Vintage', 'Modern', 'Horror', 'Comedy', 'Drama'
];

const AIStudio = () => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [contentType, setContentType] = useState('movie');
  const [style, setStyle] = useState('Cinematic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: 'Error', description: 'Please enter a prompt', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-video-script', {
        body: { 
          prompt, 
          type: selectedTool || 'video',
          style,
          contentType
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }

      setGeneratedContent(data.content);
      toast({ title: 'Generated!', description: 'Your content is ready' });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({ 
        title: 'Generation Failed', 
        description: error.message || 'Failed to generate content', 
        variant: 'destructive' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied to clipboard!' });
    }
  };

  const selectedToolData = aiTools.find(t => t.id === selectedTool);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-12">
        <div className="container mx-auto px-4 md:px-6">
          <AnimatePresence mode="wait">
            {!selectedTool ? (
              // Tool Selection View
              <motion.div
                key="selection"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Hero Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center max-w-3xl mx-auto mb-16"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full mb-6">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Powered by Advanced AI</span>
                  </div>
                  <h1 className="font-display font-bold text-4xl md:text-6xl mb-6">
                    <span className="text-gradient-gold">AI</span> Studio
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Create professional content with the power of artificial intelligence.
                    Generate videos, scripts, thumbnails, music, and more.
                  </p>
                </motion.div>

                {/* AI Tools Grid */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
                >
                  {aiTools.map((tool, index) => {
                    const Icon = tool.icon;
                    return (
                      <motion.div
                        key={tool.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <button
                          onClick={() => setSelectedTool(tool.id)}
                          className="w-full p-6 rounded-2xl border border-border bg-card hover:bg-secondary/50 hover:border-primary/50 transition-all duration-300 text-left group"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div
                              className={cn(
                                'w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br',
                                tool.color
                              )}
                            >
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            {tool.premium && (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground rounded uppercase">
                                Pro
                              </span>
                            )}
                          </div>
                          <h3 className="font-display font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                            {tool.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">{tool.description}</p>
                        </button>
                      </motion.div>
                    );
                  })}
                </motion.div>

                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                  {[
                    { label: 'Videos Generated', value: '1M+' },
                    { label: 'Active Creators', value: '50K+' },
                    { label: 'Hours Saved', value: '500K+' },
                    { label: 'AI Models', value: '15+' },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center p-6 glass rounded-xl">
                      <p className="font-display font-bold text-2xl md:text-3xl text-gradient-gold">
                        {stat.value}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              // Generation Interface
              <motion.div
                key="generation"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedTool(null);
                    setGeneratedContent(null);
                    setPrompt('');
                  }}
                  className="mb-6 gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Tools
                </Button>

                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Input Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      {selectedToolData && (
                        <div className={cn(
                          'w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br',
                          selectedToolData.color
                        )}>
                          <selectedToolData.icon className="w-7 h-7 text-white" />
                        </div>
                      )}
                      <div>
                        <h1 className="font-display font-bold text-2xl">{selectedToolData?.title}</h1>
                        <p className="text-muted-foreground">{selectedToolData?.description}</p>
                      </div>
                    </div>

                    {/* Content Type Selection */}
                    {selectedTool === 'video' && (
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Content Type</label>
                        <div className="flex flex-wrap gap-2">
                          {contentTypes.map((type) => {
                            const Icon = type.icon;
                            return (
                              <Button
                                key={type.id}
                                variant={contentType === type.id ? 'hero' : 'outline'}
                                size="sm"
                                onClick={() => setContentType(type.id)}
                                className="gap-2"
                              >
                                <Icon className="w-4 h-4" />
                                {type.label}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Style Selection */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Style</label>
                      <div className="flex flex-wrap gap-2">
                        {styles.map((s) => (
                          <Button
                            key={s}
                            variant={style === s ? 'hero' : 'outline'}
                            size="sm"
                            onClick={() => setStyle(s)}
                          >
                            {s}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Prompt Input */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Your Prompt</label>
                      <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={selectedToolData?.placeholder}
                        className="min-h-[200px] bg-card"
                      />
                    </div>

                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt.trim()}
                      className="w-full gap-2"
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Output Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-lg">Generated Content</h2>
                      {generatedContent && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                            className="gap-2"
                          >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copied' : 'Copy'}
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            Export
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="glass-card p-6 rounded-xl min-h-[400px]">
                      {isGenerating ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                            <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          </div>
                          <p className="text-muted-foreground">AI is creating your content...</p>
                        </div>
                      ) : generatedContent ? (
                        <div className="prose prose-invert max-w-none">
                          <pre className="whitespace-pre-wrap text-sm font-mono text-foreground/90 leading-relaxed">
                            {generatedContent}
                          </pre>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <Play className="w-8 h-8 text-primary" />
                          </div>
                          <p className="text-muted-foreground">
                            Enter a prompt and click Generate to create content
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AIStudio;
