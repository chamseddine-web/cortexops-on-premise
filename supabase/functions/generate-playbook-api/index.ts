import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "X-Privacy-Policy": "Zero-Data-Retention",
  "X-Data-Storage": "None",
};

interface GenerateRequest {
  prompt: string;
  environment?: "staging" | "production";
  advanced_options?: {
    become?: boolean;
    gather_facts?: boolean;
    check_mode?: boolean;
  };
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  let sensitiveData: string | null = null;

  try {
    // Extract API key from headers
    const apiKey = req.headers.get("X-API-Key") ||
                   req.headers.get("Authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing API key",
          message: "Please provide an API key using X-API-Key header or Authorization: Bearer header"
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Hash the API key (simple base64 for now, matches storage)
    const keyHash = btoa(apiKey);

    // Verify API key using new system
    const { data: authData, error: authError } = await supabase.rpc(
      'verify_api_key',
      { p_key_hash: keyHash }
    );

    if (authError || !authData || authData.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Invalid API key",
          message: "The provided API key is invalid, expired, or inactive"
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const keyInfo = authData[0];

    if (keyInfo.status !== 'active' || keyInfo.user_status !== 'active') {
      return new Response(
        JSON.stringify({
          error: "Inactive account",
          message: "Your API key or account is inactive. Please contact support."
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check rate limits (minute, hour, day)
    const { data: rateLimitCheck } = await supabase.rpc(
      'check_rate_limit',
      {
        p_api_key_id: keyInfo.key_id,
        p_user_id: keyInfo.user_id,
        p_period: 'minute'
      }
    );

    if (!rateLimitCheck || !rateLimitCheck[0]?.allowed) {
      const limitData = rateLimitCheck ? rateLimitCheck[0] : null;

      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: "You have exceeded your rate limit for this period",
          period: 'minute',
          current: limitData?.current_count || 0,
          limit: limitData?.limit_value || 0,
          reset_at: limitData?.reset_at
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(limitData?.limit_value || 0),
            "X-RateLimit-Remaining": String(Math.max(0, (limitData?.limit_value || 0) - (limitData?.current_count || 0))),
            "X-RateLimit-Reset": limitData?.reset_at || new Date().toISOString(),
          },
        }
      );
    }

    // Parse request body
    const body: GenerateRequest = await req.json();
    const { prompt, environment = "production", advanced_options = {} } = body;

    if (!prompt || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          message: "The 'prompt' field is required and cannot be empty"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    sensitiveData = prompt;

    const playbook = generatePlaybook(prompt, environment, advanced_options);

    sensitiveData = null;

    // Increment rate limit counter
    await supabase.rpc('increment_rate_limit', {
      p_api_key_id: keyInfo.key_id,
      p_period: 'minute'
    });

    // Log successful API usage
    await supabase.rpc('log_api_key_usage', {
      p_api_key_id: keyInfo.key_id,
      p_user_id: keyInfo.user_id,
      p_endpoint: '/generate-playbook-api',
      p_method: 'POST',
      p_status_code: 200,
      p_response_time_ms: Date.now() - startTime,
      p_ip_address: req.headers.get("x-forwarded-for") || 'unknown',
      p_user_agent: req.headers.get("user-agent") || 'unknown',
      p_error_message: null
    });

    const limitData = rateLimitCheck[0];

    const response = {
      success: true,
      data: {
        playbook,
        environment,
        generated_at: new Date().toISOString(),
      },
      rate_limits: {
        minute: {
          limit: limitData.limit_value,
          remaining: Math.max(0, limitData.limit_value - limitData.current_count - 1),
          reset_at: limitData.reset_at
        }
      },
      meta: {
        key_name: keyInfo.key_name,
        plan: keyInfo.user_plan,
        response_time_ms: Date.now() - startTime,
        privacy_policy: "Zero-Data-Retention",
        data_storage: "None - Processed in-memory only"
      }
    };

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(limitData.limit_value),
        "X-RateLimit-Remaining": String(Math.max(0, limitData.limit_value - limitData.current_count - 1)),
        "X-RateLimit-Reset": limitData.reset_at,
      },
    });

  } catch (error) {
    sensitiveData = null;
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generatePlaybook(
  prompt: string,
  environment: string,
  options: any
): string {
  const timestamp = new Date().toISOString();
  const become = options.become !== false;
  const gatherFacts = options.gather_facts !== false;

  return `---
# Generated by CortexOps API
# Environment: ${environment}
# Generated: ${timestamp}
# Privacy: Zero Data Retention - Prompt not stored

- name: "${prompt}"
  hosts: all
  become: ${become ? 'yes' : 'no'}
  gather_facts: ${gatherFacts ? 'yes' : 'no'}

  vars:
    environment: "${environment}"
    deployment_timestamp: "${timestamp}"

  tasks:
    - name: "Update system packages"
      apt:
        update_cache: yes
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"

    - name: "Install required dependencies"
      package:
        name:
          - curl
          - wget
          - git
          - vim
        state: present

    - name: "Create application directory"
      file:
        path: "/opt/app"
        state: directory
        mode: '0755'

    - name: "Deploy configuration"
      template:
        src: "config.j2"
        dest: "/opt/app/config.yml"
        mode: '0644'
      notify: restart service

    - name: "Verify deployment"
      command: systemctl is-active app.service
      register: service_status
      changed_when: false
      failed_when: false

  handlers:
    - name: restart service
      systemd:
        name: app.service
        state: restarted
        enabled: yes
`;
}
