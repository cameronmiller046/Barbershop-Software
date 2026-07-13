-- Aggregate review count for the storefront (paired with googleRating).
ALTER TABLE "Tenant" ADD COLUMN "googleReviewCount" INTEGER;

-- Flagship demo shop: real Google aggregate (4.6 across 36 reviews).
UPDATE "Tenant" SET "googleRating" = 4.6, "googleReviewCount" = 36 WHERE "slug" = 'professional-barbershop';

-- Reseed the flagship's published reviews with a curated positive sample.
DELETE FROM "Review" WHERE "tenantId" IN (SELECT "id" FROM "Tenant" WHERE "slug" = 'professional-barbershop');

INSERT INTO "Review" ("id", "authorName", "rating", "body", "published", "tenantId", "createdAt")
SELECT
  md5(random()::text || clock_timestamp()::text || v.ord::text),
  v.author, v.rating, v.body, true, t."id",
  now() - (v.ord * 19) * INTERVAL '1 day'
FROM "Tenant" t
CROSS JOIN (VALUES
  (1, 'Tyrese Artist', 5, 'Jazmyn always gets my husband''s hair straight — best hairstylist I''ve seen do his hair. Greg did my hair and did a great job; he''s gonna be my new barber. Great conversation and a clean environment. And Mike keeps the energy going in the shop — always dying laughing. Keep up the good work!'),
  (2, 'S.', 5, 'Kayla did a GREAT job on my hair. I''m usually shy and afraid of trying new stylists and locations, but I actually felt welcome here! Definitely recommend.'),
  (3, 'Zulu Adam', 5, 'I''ve been getting my hair cut here for years and it''s the best place in town. Go check it out for yourself — you won''t regret a thing. A thousand stars ✨'),
  (4, 'Terrell Mack', 5, 'Ask for Jackie! She is the best barber in the world.'),
  (5, 'Latoya Young', 5, 'Love getting my locs done here. Ask for Sonia — she''s the best.'),
  (6, 'Tony Doyley', 5, 'Joey is the best cut in town!'),
  (7, 'Teresa Campbell', 5, 'Very professional, neat and clean. The service is superb.'),
  (8, 'Shurea Richardson', 5, 'My stylist took great care of me and talked me through everything she was doing. Great conversation, and I really loved my hair in the end!'),
  (9, 'ATL Beastmode', 5, 'Mike Dixon cuts really good — best I''ve had, and I''m 40 years old.'),
  (10, 'Darlene Franklin', 5, 'Sonja does wonderful dreadlocks — starter locs and otherwise.'),
  (11, 'WB Media', 5, 'Lee the barber is great at what he does!'),
  (12, 'Ernestine Willis', 5, 'Excellent service and very clean.'),
  (13, 'Jarvis Hearns', 5, 'A great place to get your hair cut or loc''d.'),
  (14, 'Lewis Gardner', 5, 'Great atmosphere and open-minded staff.'),
  (15, 'Jermaine Quinn', 5, 'It''s the truth — you leave fresh every time.'),
  (16, 'Joshua Spires', 5, 'I came out with exactly the haircut I deserved.'),
  (17, 'Byron Tillmon', 5, 'Good, professional service!'),
  (18, 'Ameer Perkins', 4, 'Great customer service — worth the wait even when there''s a line.'),
  (19, 'Theodore Nixon', 5, 'Love the shop.'),
  (20, 'Sevyn Chaniel', 5, 'Solid.')
) AS v(ord, author, rating, body)
WHERE t."slug" = 'professional-barbershop';
