-- Hephzibah Media: starter catalogue (proposed; owner to confirm names). No prices are invented.
insert into occasions (slug, name, applies_to, sort_order) values
  ('wedding',               'Wedding',                       '{photography,videography}', 10),
  ('traditional-marriage',  'Engagement / traditional marriage', '{photography,videography}', 20),
  ('outdooring',            'Outdooring / naming ceremony',  '{photography,videography}', 30),
  ('birthday',              'Birthday',                      '{photography,videography}', 40),
  ('graduation',            'Graduation',                    '{photography,videography}', 50),
  ('funeral-memorial',      'Funeral / memorial',            '{photography,videography}', 60),
  ('church-event',          'Church or religious event',     '{photography,videography}', 70),
  ('corporate-event',       'Corporate event or conference', '{photography,videography}', 80),
  ('brand-campaign',        'Brand or product campaign',     '{photography,videography,design}', 90),
  ('music-video',           'Music video',                   '{videography}', 100);

insert into services (kind, slug, name, summary, sort_order) values
  ('photography','event-photography','Event photography','Coverage of your day from first guest to last dance, delivered as an edited gallery.',10),
  ('photography','portrait-photography','Portraits and headshots','Studio or on-location portraits for individuals, families and teams.',20),
  ('photography','product-photography','Product and commercial photography','Clean, consistent images for catalogues, menus and online shops.',30),
  ('videography','event-videography','Event videography','Highlight films and full-length coverage of ceremonies and receptions.',10),
  ('videography','music-video','Music videos','Concept to final cut for artists.',20),
  ('videography','brand-promo-video','Brand and promotional video','Short films for businesses, campaigns and social channels.',30),
  ('design','logo-and-brand-identity','Logo and brand identity','Logo, colours, type and usage guide.',10),
  ('design','flyers-and-posters','Flyers and posters','Print and digital promotion for events and businesses.',20),
  ('design','social-media-graphics','Social media graphics','Templates and campaign sets sized for each platform.',30),
  ('design','invitations-and-print','Invitations and print materials','Invitations, programmes, brochures and banners.',40);
