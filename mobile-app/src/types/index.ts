export interface Recommendation {
  id: string
  created_by: string | null
  category: 'Book' | 'Movie' | 'Series' | 'Activity' | 'Other'
  name: string
  recommender_name: string
  website_link: string | null
  description: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  recommendation_id: string
  commenter_id: string | null
  commenter_name: string
  comment_text: string | null
  rating: number
  created_at: string
}

export interface Profile {
  id: string
  name: string | null
  is_admin: boolean
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
