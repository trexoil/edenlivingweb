alter table "public"."profiles" 
add column if not exists "car_plate_1" text,
add column if not exists "car_plate_2" text;
