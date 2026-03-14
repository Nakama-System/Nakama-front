// types/movie.ts — Nakama · Tipos compartidos de películas

// app/types/movie.ts
export interface MovieItem {
  id:          string;
  title:       string;
  description: string;
  thumbnail:   string;
  videoUrl:    string;
  year:        number;
  duration:    string | number;
  category:    string;
  ageRating:   "all" | "+10" | "+13" | "+18"; 
  canDownload: boolean;
  isPublished: boolean;
  rating:      number;
  votesCount:  number;
  userVoted:   boolean;
  views:       number;
  slug:        string;
  publicUrl:   string;
  createdAt:   string;
}

export interface MoviesResponse {
  items:      MovieItem[];
  total:      number;
  page:       number;
  totalPages: number;
  limit:      number;
}

export interface ShareMeta {
  url:       string;
  title:     string;
  description: string;
  image:     string;
  facebook:  string;
  whatsapp:  string;
  twitter:   string;
  telegram:  string;
}