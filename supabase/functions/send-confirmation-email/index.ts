import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { Resend } from 'npm:resend@4.0.0';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import React from 'npm:react@18.3.1';
import { ConfirmationEmail } from './_templates/confirmation-email.tsx';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const hookSecret = Deno.env.get('CONFIRMATION_EMAIL_HOOK_SECRET') as string;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    
    // Verify webhook if secret is provided
    if (hookSecret) {
      const wh = new Webhook(hookSecret);
      try {
        wh.verify(payload, headers);
      } catch (err) {
        console.error('Webhook verification failed:', err);
        return new Response('Unauthorized', { 
          status: 401, 
          headers: corsHeaders 
        });
      }
    }

    const data = JSON.parse(payload);
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type, site_url }
    } = data;

    console.log('Processing confirmation email for:', user.email);
    console.log('Email action type:', email_action_type);
    console.log('Redirect to:', redirect_to);

    // Create confirmation URL that points to your app
    const confirmationUrl = `${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to || `${site_url}/app/dashboard`)}`;

    // Render the email template
    const html = await renderAsync(
      React.createElement(ConfirmationEmail, {
        confirmationUrl,
        userEmail: user.email,
        siteName: 'DukaFiti'
      })
    );

    // Send email using Resend
    const { error } = await resend.emails.send({
      from: 'DukaFiti <onboarding@resend.dev>',
      to: [user.email],
      subject: 'Confirm your DukaFiti account',
      html,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    console.log('Confirmation email sent successfully to:', user.email);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in send-confirmation-email function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);