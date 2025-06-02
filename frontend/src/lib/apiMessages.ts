export interface ApiError {
  success: false
  message: string
  errors?: { message: string; field?: string }[]
}

export interface ApiResponse<T> {
  success: true
  message: string
  data: T
}
