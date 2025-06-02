'use client'

import type React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { User, LoginRequest, RegisterRequest } from '@/types'
import { useToast } from '@/hooks/use-toast'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Get user profile
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: apiClient.getProfile,
    enabled: !!localStorage.getItem('accessToken'),
    retry: false,
  })

  useEffect(() => {
    if (profileData) {
      setUser(profileData)
    }
  }, [profileData])

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: apiClient.login,
    onSuccess: (data: any) => {
      apiClient.setToken(data.data.token)
      console.log('Login successful, setting token:', data.data.token)
      setUser(data.data.user)
      console.log('User data after login:', data)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast({
        title: 'Success',
        description: 'Logged in successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: apiClient.register,
    onSuccess: (data) => {
      apiClient.setToken(data.token)
      setUser(data.user)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast({
        title: 'Success',
        description: 'Account created successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: apiClient.logout,
    onSuccess: () => {
      apiClient.setToken(null)
      setUser(null)
      queryClient.clear()
      toast({
        title: 'Success',
        description: 'Logged out successfully',
      })
    },
    onError: (/*error: Error*/) => {
      // Even if logout fails on server, clear local state
      apiClient.setToken(null)
      setUser(null)
      queryClient.clear()
      toast({
        title: 'Warning',
        description: 'Logged out locally',
        variant: 'destructive',
      })
    },
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: apiClient.updateProfile,
    onSuccess: (data) => {
      setUser(data)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const login = async (data: LoginRequest) => {
    await loginMutation.mutateAsync(data)
  }

  const register = async (data: RegisterRequest) => {
    await registerMutation.mutateAsync(data)
  }

  const logout = async () => {
    await logoutMutation.mutateAsync()
  }

  const updateProfile = async (data: Partial<User>) => {
    await updateProfileMutation.mutateAsync(data)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
