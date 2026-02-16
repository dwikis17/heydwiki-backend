import { createClient } from "@supabase/supabase-js";

type StorageConfig = {
  url: string;
  serviceRoleKey: string;
  bucket: string;
};

const getStorageConfig = (): StorageConfig => {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "images";

  if (!url) {
    throw new Error("SUPABASE_URL is not configured");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  if (url.includes("YOUR_PROJECT_ID") || url.includes("example.com")) {
    throw new Error("SUPABASE_URL is still a placeholder value");
  }

  if (serviceRoleKey.includes("YOUR_SUPABASE_SERVICE_ROLE_KEY")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is still a placeholder value");
  }

  return { url, serviceRoleKey, bucket };
};

export const getStorageBucket = (): string => {
  return getStorageConfig().bucket;
};

export const getSupabaseAdminClient = () => {
  const { url, serviceRoleKey } = getStorageConfig();
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};
