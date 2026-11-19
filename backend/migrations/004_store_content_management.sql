create table if not exists store_content (
  content_key text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists store_profiles (
  id uuid primary key default gen_random_uuid(),
  is_owner boolean not null default false,
  name text not null,
  designation text not null,
  department text not null default '',
  biography text not null default '',
  photo_url text,
  skills text[] not null default '{}',
  social_url text,
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists store_profiles_single_owner_idx on store_profiles(is_owner) where is_owner;

create table if not exists store_faqs (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists store_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  address text not null,
  latitude numeric(10,7),
  longitude numeric(10,7),
  phone text not null default '',
  email text not null default '',
  hours text not null default '',
  services text[] not null default '{}',
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);

insert into store_content(content_key, content) values
('identity', '{"email":"help@stacked.store","phone":"","address":"","businessHours":"Monday to Friday, 8:00 AM to 6:00 PM","whatsappNumber":"","description":"Curated laptops and desk gear with helpful, straightforward customer support."}'::jsonb),
('story', '{"established":"","history":"Stacked was created to make choosing work-ready technology more straightforward. We bring a focused product range and customer guidance together so people can make informed choices without the buying noise.","mission":"Help customers find dependable technology that fits their work, study, and everyday needs.","vision":"Build a trusted local technology store known for useful advice, clear information, and dependable support.","commitment":"We aim to give clear product information, practical guidance, and responsive help before and after a purchase.","future":"Continue improving the range and the support customers receive as their technology needs change.","values":[{"title":"Customer first","description":"Listen carefully and help people choose what fits their needs."},{"title":"Trust and clarity","description":"Keep product details, pricing, and policies easy to understand."},{"title":"Quality and reliability","description":"Choose useful products and stand behind customers after purchase."},{"title":"Professional care","description":"Treat every question and order with attention and respect."}]}'::jsonb),
('policies', '{"shipping":"Delivery options, coverage, timelines, and charges are confirmed at checkout or by customer care before dispatch.","tracking":"Contact customer care with your order reference for a dispatch or tracking update.","pickup":"In-store pickup availability and location are confirmed with the customer before collection.","returns":"Contact customer care before returning an item. The team will confirm eligibility, condition requirements, and the correct return route.","refunds":"Refund eligibility is assessed against the published returns policy and the condition of the item.","warranty":"Warranty duration and conditions depend on the product and are shown on its product listing or confirmed by customer care.","damaged":"Report damaged or defective items to customer care promptly with your order reference and clear photos where possible."}'::jsonb)
on conflict (content_key) do nothing;

update store_content c set content = c.content || jsonb_build_object(
  'phone', case when s.value->>'supportPhone' in ('+254 700 000 000','') then '' else coalesce(s.value->>'supportPhone','') end,
  'whatsappNumber', case when s.value->>'whatsappNumber' in ('254700000000','') then '' else coalesce(s.value->>'whatsappNumber','') end
)
from store_settings s where c.content_key='identity' and s.key='storefront' and c.content->>'phone'='';

insert into store_profiles(is_owner, name, designation, department, biography, sort_order, is_featured, is_published)
select true, 'Nicholas Maina', 'Founder & Owner', 'Leadership', 'Leads the store’s direction, product curation, and customer experience.', 0, true, true
where not exists (select 1 from store_profiles where is_owner);

insert into store_faqs(category, question, answer, sort_order, is_published)
select v.category, v.question, v.answer, 0, true
from (values
  ('Orders and Payments', 'Which payment method is available for online checkout?', 'Online checkout currently offers an M-Pesa STK prompt. Approve the request on your phone; the order page updates after payment confirmation.'),
  ('Shipping and Delivery', 'How can I get a delivery update?', 'Contact customer care with your order reference to ask for the latest dispatch or tracking information.'),
  ('Returns and Refunds', 'How do I start a return?', 'Contact customer care before sending an item back. The team will confirm eligibility and provide return instructions.'),
  ('Product Warranty', 'Where can I check the warranty for a product?', 'Warranty duration and conditions are listed on the product page or can be confirmed by customer care.'),
  ('Product Availability', 'How do I confirm an item is in stock?', 'Check the product page or contact customer care with the product name before travelling or placing an order.'),
  ('Account and Customer Support', 'How do I contact customer care?', 'Use the contact form on the Customer Care page or contact the store using the published support details.')
) as v(category, question, answer)
where not exists (select 1 from store_faqs f where f.category=v.category and f.question=v.question);

update inquiries set status='in_progress' where status='contacted';
update inquiries set status='resolved' where status in ('completed','complete');
