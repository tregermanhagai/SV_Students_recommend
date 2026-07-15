export interface Recommendation {
  id: string
  user_id: string
  category: 'Book' | 'Movie' | 'Series' | 'Activity' | 'Other'
  title: string
  recommender: string
  url: string | null
  description: string
  image_url: string | null
  created_at: string
}

export interface Comment {
  id: string
  recommendation_id: string
  user_id: string
  author_name: string
  body: string
  rating: number
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface MovieDict {
  title: string | null
  year: string | null
  rating: number | null
  genres: string[] | null
  runtime: number | null
  directors: string[] | null
  cast: string[] | null
  overview: string | null
  poster_url: string | null
  poster_full: string | null
  imdb_id: string | null
  imdb_url: string | null
  trailer_url: string | null
}

export interface MovieAIResponse {
  answer: string | null
  movie: MovieDict | null
}
