-- Seguimiento del contacto con las marcas (permiso para aparecer en Emer).
-- Ejecutar una vez en el SQL editor de Supabase.

-- Estado de la peticion: una fila por marca.
create table if not exists public.brand_outreach (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null unique references public.brands(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'contacted', 'in_conversation', 'approved', 'rejected', 'no_response')),
  contact_name text,
  instagram text,
  email text,
  notes text,
  follow_up_at date,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Historial de mensajes enviados y recibidos, por cualquier canal.
create table if not exists public.brand_outreach_messages (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  channel text not null
    check (channel in ('instagram', 'email', 'whatsapp', 'phone', 'web_form', 'in_person', 'other')),
  direction text not null check (direction in ('outbound', 'inbound')),
  body text not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists brand_outreach_messages_brand_sent_idx
  on public.brand_outreach_messages (brand_id, sent_at desc);

-- Sin politicas: solo la service role (el panel) puede leer y escribir.
alter table public.brand_outreach enable row level security;
alter table public.brand_outreach_messages enable row level security;
