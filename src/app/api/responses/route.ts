import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const submitResponseSchema = z.object({
  surveyId: z.string(),
  userId: z.string().optional().nullable(), // Changed from playerId to userId
  playerId: z.string().optional().nullable(), // Keep for backward compatibility
  playerName: z.string().optional().nullable(),
  playerEmail: z.string().optional().nullable(),
  answers: z.array(z.object({
    questionId: z.string(),
    value: z.string()
  })),
  bodyMapData: z.record(z.string(), z.number()).optional().nullable()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received survey submission:', body)
    const validatedData = submitResponseSchema.parse(body)
    console.log('Validated data:', validatedData)

    // Verify survey exists (allow inactive recurring surveys for testing)
    const survey = await prisma.survey.findUnique({
      where: {
        id: validatedData.surveyId
      },
      include: {
        questions: true
      }
    })

    if (!survey) {
      return NextResponse.json(
        { error: 'Survey not found or inactive' },
        { status: 404 }
      )
    }

    // Use userId if provided, otherwise fall back to playerId for backward compatibility
    const userId = validatedData.userId || validatedData.playerId
    
    // Check if user already has a response for today and delete it
    if (userId) {
      console.log('=== DAILY RESPONSE LOGIC START ===')
      console.log('User ID:', userId)
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      console.log('Date range - Today:', today.toISOString(), 'Tomorrow:', tomorrow.toISOString())
      
      const existingResponses = await prisma.response.findMany({
        where: {
          surveyId: validatedData.surveyId,
          userId: userId,
          submittedAt: {
            gte: today,
            lt: tomorrow
          }
        }
      })
      
      console.log('Found existing responses:', existingResponses.length)
      console.log('Existing response IDs:', existingResponses.map(r => r.id))
      
      if (existingResponses.length > 0) {
        console.log('Deleting', existingResponses.length, 'existing responses...')
        
        // Delete existing responses and their answers
        for (const existingResponse of existingResponses) {
          console.log('Deleting response:', existingResponse.id)
          await prisma.answer.deleteMany({
            where: { responseId: existingResponse.id }
          })
          await prisma.response.delete({
            where: { id: existingResponse.id }
          })
          console.log('Deleted response:', existingResponse.id)
        }
        
        console.log('Successfully deleted all existing responses for today')
      } else {
        console.log('No existing responses found for today')
      }
      console.log('=== DAILY RESPONSE LOGIC END ===')
    } else {
      console.log('No userId provided, skipping daily response logic')
    }

    // Create response with answers
    console.log('Creating response with data:', {
      surveyId: validatedData.surveyId,
      userId: userId || null,
      playerName: validatedData.playerName || null,
      playerEmail: validatedData.playerEmail || null,
      answersCount: validatedData.answers.length
    })
    
    const response = await prisma.response.create({
      data: {
        surveyId: validatedData.surveyId,
        ...(userId && { userId: userId }),
        ...(validatedData.playerName && { playerName: validatedData.playerName }),
        ...(validatedData.playerEmail && { playerEmail: validatedData.playerEmail }),
        answers: {
          create: validatedData.answers.map(answer => ({
            questionId: answer.questionId,
            value: answer.value
          }))
        }
      },
      include: {
        answers: {
          include: {
            question: true
          }
        }
      }
    })
    
    console.log('Response created successfully:', response.id)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error submitting response:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.issues)
      console.error('Failed validation details:', error.issues.map(e => ({
        path: e.path,
        message: e.message,
        code: e.code
      })))
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    
    // If table doesn't exist yet, return helpful error
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json(
        { error: 'Database tables not created yet. Please run migrations first.', details: error.message },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to submit response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
