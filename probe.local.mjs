import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const { data, error } = await sb.storage.listBuckets();
if (error) {
  console.log("ERROR listBuckets:", error.message);
  process.exit(1);
}
console.log(
  "buckets:",
  data.map((b) => `${b.name} (public=${b.public})`).join(", ") || "(ninguno)",
);
const brands = data.find((b) => b.name === "brands");
if (brands) {
  const list = await sb.storage.from("brands").list("", { limit: 6 });
  console.log(
    "archivos en brands:",
    list.data?.map((f) => `${f.name} ${(f.metadata?.size / 1024).toFixed(0)}KB`).join(" | ") ??
      list.error?.message,
  );
}
const withImg = await sb.from("brands").select("name, img, logo").not("logo", "is", null).limit(3);
for (const b of withImg.data ?? []) console.log(`${b.name}: logo=${b.logo}`);
