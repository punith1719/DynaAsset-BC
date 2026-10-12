import { createClient } from "@supabase/supabase-js";

// Same project as your D365 app — the new tables (assets_bc, workorders_bc)
// live alongside assets_d365 etc. in the same Supabase instance, unless
// you decide to run BC in a separate project entirely.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
