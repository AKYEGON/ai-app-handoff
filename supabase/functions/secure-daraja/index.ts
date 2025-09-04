import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ENC_KEY = Deno.env.get("DARAJA_ENCRYPTION_KEY") || Deno.env.get("ENCRYPTION_KEY");

function requireEnv() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase env vars");
  }
  if (!ENC_KEY) {
    throw new Error("Missing DARAJA_ENCRYPTION_KEY (or ENCRYPTION_KEY)");
  }
}

// Crypto helpers (AES-GCM, enc:v1:<iv_b64>:<cipher_b64>)
async function getCryptoKey() {
  const raw = new TextEncoder().encode(ENC_KEY as string);
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function b64encode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  // btoa is available in Deno runtime
  // deno-lint-ignore no-explicit-any
  return (btoa as any)(binary);
}

function b64decode(b64: string): Uint8Array {
  // deno-lint-ignore no-explicit-any
  const binary = (atob as any)(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function encrypt(value: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(value);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return `enc:v1:${b64encode(iv)}:${b64encode(cipher)}`;
}

async function mask(value: string | null): Promise<string> {
  if (!value) return "";
  // Do not decrypt to return plaintext. Return masked indicator only.
  return "••••••••";
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    requireEnv();

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (req.method === "POST" && action === "upsert") {
      const input = (body?.data ?? {}) as {
        business_short_code?: string | null;
        is_sandbox?: boolean;
        consumer_key?: string | null;
        consumer_secret?: string | null;
        passkey?: string | null;
      };

      // Load existing row
      const { data: existing } = await supabase
        .from("daraja_credentials")
        .select("id, consumer_key, consumer_secret, passkey, business_short_code, is_sandbox")
        .eq("user_id", user.id)
        .maybeSingle();

      const row: Record<string, unknown> = {
        user_id: user.id,
        business_short_code: input.business_short_code ?? existing?.business_short_code ?? null,
        is_sandbox: typeof input.is_sandbox === "boolean" ? input.is_sandbox : (existing?.is_sandbox ?? true),
        updated_at: new Date().toISOString(),
      };

      // Only update sensitive fields if provided non-empty; otherwise keep existing
      if (input.consumer_key && input.consumer_key.trim() !== "") {
        row.consumer_key = await encrypt(input.consumer_key.trim());
      } else if (existing) {
        row.consumer_key = existing.consumer_key;
      }

      if (input.consumer_secret && input.consumer_secret.trim() !== "") {
        row.consumer_secret = await encrypt(input.consumer_secret.trim());
      } else if (existing) {
        row.consumer_secret = existing.consumer_secret;
      }

      if (input.passkey && input.passkey.trim() !== "") {
        row.passkey = await encrypt(input.passkey.trim());
      } else if (existing) {
        row.passkey = existing.passkey;
      }

      const { error } = await supabase.from("daraja_credentials").upsert(row, { onConflict: "user_id" });
      if (error) {
        console.error("secure-daraja upsert error", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    if (req.method === "POST" && action === "get") {
      const { data, error } = await supabase
        .from("daraja_credentials")
        .select("business_short_code, is_sandbox, consumer_key, consumer_secret, passkey")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("secure-daraja get error", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      return new Response(
        JSON.stringify({
          business_short_code: data?.business_short_code ?? "",
          is_sandbox: data?.is_sandbox ?? true,
          consumer_key_masked: await mask(data?.consumer_key ?? null),
          consumer_secret_masked: await mask(data?.consumer_secret ?? null),
          passkey_masked: await mask(data?.passkey ?? null),
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e: any) {
    console.error("secure-daraja fatal", e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
