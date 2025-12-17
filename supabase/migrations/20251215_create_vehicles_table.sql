-- Drop columns from profiles if they exist (cleanup from previous attempt)
alter table "public"."profiles" 
drop column if exists "car_plate_1",
drop column if exists "car_plate_2";

-- Create vehicles table
create table if not exists "public"."vehicles" (
    "id" uuid not null default gen_random_uuid(),
    "resident_id" uuid not null references "public"."profiles"("id") on delete cascade,
    "plate_number" text not null,
    "type" text not null check (type in ('resident', 'visitor')),
    "status" text not null default 'active' check (status in ('active', 'inactive')),
    "valid_from" timestamp with time zone,
    "valid_until" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    primary key ("id")
);

-- Add RLS policies
alter table "public"."vehicles" enable row level security;

create policy "Users can view their own vehicles"
    on "public"."vehicles"
    for select
    using (auth.uid() = resident_id);

create policy "Users can insert their own vehicles"
    on "public"."vehicles"
    for insert
    with check (auth.uid() = resident_id);

create policy "Users can update their own vehicles"
    on "public"."vehicles"
    for update
    using (auth.uid() = resident_id);

create policy "Users can delete their own vehicles"
    on "public"."vehicles"
    for delete
    using (auth.uid() = resident_id);
