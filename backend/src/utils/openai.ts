import OpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config() // Ensure environment variables are loaded

const openaiApiKey = process.env.OPENAI_API_KEY

if (!openaiApiKey) {
  console.warn(
    'Warning: OPENAI_API_KEY is not set. OpenAI related functionalities will not work.'
  )
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
})

export default openai
