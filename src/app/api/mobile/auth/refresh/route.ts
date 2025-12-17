import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const { refreshToken } = await request.json()

        if (!refreshToken) {
            return NextResponse.json(
                { success: false, error: 'Refresh token is required' },
                { status: 400 }
            )
        }

        // Initialize Supabase client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Refresh the session
        const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken,
        })

        if (error) {
            console.error('Token refresh error:', error.message)
            return NextResponse.json(
                { success: false, error: 'Failed to refresh token' },
                { status: 401 }
            )
        }

        if (!data.session) {
            return NextResponse.json(
                { success: false, error: 'No session returned' },
                { status: 401 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                token: data.session.access_token,
                refreshToken: data.session.refresh_token,
                user: data.user
            }
        })

    } catch (error) {
        console.error('Refresh API error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}
