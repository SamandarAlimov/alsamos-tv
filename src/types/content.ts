export interface Content {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  backdrop: string;
  trailer?: string;
  year: number;
  rating: string;
  duration: string;
  genres: string[];
  type: 'movie' | 'series' | 'short';
  seasons?: number;
  episodes?: number;
  cast?: string[];
  director?: string;
  aiScore?: number;
  isOriginal?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
}

export interface Category {
  id: string;
  title: string;
  items: Content[];
}

export interface Channel {
  id: string;
  name: string;
  logo: string;
  category: string;
  isLive: boolean;
  currentProgram?: string;
  viewers?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  subscription: 'free' | 'plus' | 'pro' | 'vip';
  profiles: Profile[];
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  isKids: boolean;
  pin?: string;
}
