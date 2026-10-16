# Photo uploads

Replace these paths with real JPG photos. All paths are relative to this folder. Original colored panels and labels remain visible until a photo is supplied. The Next.js fallback returns a transparent SVG for absent JPGs, avoiding broken images and failed resource requests. Photos use object-fit: cover; reused photos are cropped to the original panel shape. No image contains the logo background.

Uploaded PNG/JPG files are retained as originals. After adding or replacing a photo, run `node scripts/optimize-justbrunch-images.mjs` from the repository root. This creates WebP variants in `optimized/` at up to 480, 800, 1200, and 1600 pixels wide (without enlarging originals) and updates the generated source index in `shared/site.js`. Commit the variants and index with the photo. The browser selects a size for the card and screen density; visible hero photos receive priority, and offscreen photos load lazily. Originals remain the fallback for a failed optimized image.

For a small update, pass the changed filenames after the command (for example, `node scripts/optimize-justbrunch-images.mjs dish-oxtail-alfredo.png`). Existing variants for other photos are reused; missing variants are always generated.

| Filename | Label | Pages | Recommended size | Ratio |
|---|---|---|---|---|
| dish-avocado-toast.png | Avocado Toast | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-bacon-egg-cheddar-cheese-sandwich-on-croissant-toast.png | Bacon Egg & Cheddar Cheese Sandwich on Croissant Toast | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-bacon-pork-or-turkey.png | Bacon (Pork or Turkey) | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-banana-glazed-pancakes.png | Banana Glazed Pancakes | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-breakfast-burger.png | Breakfast Burger | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-brunch-platter.png | Brunch Platter — uploaded photo | All concepts: Menu & Order; POS | 1448 × 1086 px (supplied) | 4:3 |
| dish-cardel-platter.png | Cardel Platter | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-charbroiled-oysters.png | Charbroiled Oysters | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-cheesecake.png | Cheesecake | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-chicken-golden-waffle.png | Chicken & Golden Waffle — uploaded photo | All concepts: Menu & Order; POS<br>after-hours/Home<br>golden-hour/Home<br>mimosa-pop/Home | 1448 × 1086 px (supplied) | 4:3 |
| dish-cinnamon-toast-crunch-french-toast.png | Cinnamon Toast Crunch French Toast | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-combo-alfredo.png | Combo Alfredo (Pick 2) | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-corned-beef-hash.png | Corned Beef Hash | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-crab-dip.png | Crab Dip — uploaded photo | All concepts: Menu & Order; POS<br>after-hours/Home<br>mimosa-pop/Home | 1536 × 1024 px (supplied) | 3:2 (supplied) |
| dish-eggs-any-style.png | Eggs (Any Style) | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-fish-grits.png | Fish & Grits | All concepts: Menu & Order; POS | 1448 × 1086 px | 4:3 |
| dish-french-toast.png | French Toast | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-fried-fish-fries-whiting.png | Fried Fish & Fries (Whiting) | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-fried-salmon-bites.png | Fried Salmon Bites | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-fruity-pebble-french-toast.png | Fruity Pebble French Toast — uploaded photo | All concepts: Menu & Order; POS<br>after-hours/Home<br>golden-hour/Home<br>mimosa-pop/Home | 1536 × 1024 px (supplied) | 3:2 (supplied) |
| dish-garlic-butter-jumbo-shrimp.png | Garlic Butter Jumbo Shrimp | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-garlic-fries.png | Garlic Fries | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-garlic-steak-bites.png | Garlic Steak Bites | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-grandma-breakfast.png | Grandma Breakfast | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-grits.png | Grits | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-jumbo-shrimp-alfredo.png | Jumbo Shrimp Alfredo | All concepts: Menu & Order; POS | 1448 × 1086 px | 4:3 |
| dish-just-brunch-sampler.png | Just Brunch Sampler — uploaded photo | All concepts: Menu & Order; POS<br>after-hours/Home<br>golden-hour/Home<br>start-here/golden-hour/Golden Hour — Home (dark)-html/GoldenHour-Home.dc.html<br>start-here/golden-hour/Golden Hour — Home (light)-html/GoldenHour-Home.dc.html<br>start-here/golden-hour/Golden Hour — Instagram-html/GoldenHour-Instagram.dc.html<br>mimosa-pop/Home<br>start-here/mimosa-pop/Mimosa Pop — Instagram-html/MimosaPop-Instagram.dc.html | 1448 × 1086 px (supplied) | 4:3 |
| dish-lamb-chops-alfredo.png | Lamb Chops Alfredo | All concepts: Menu & Order; POS | 1448 × 1086 px | 4:3 |
| dish-lamb-chops-potatoes.png | Lamb Chops & Potatoes — uploaded photo | All concepts: Menu & Order; POS | 1536 × 1024 px (supplied) | 3:2 (supplied) |
| dish-new-orleans-style-bread-pudding.png | New Orleans-Style Bread Pudding | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-oxtail-alfredo.png | Oxtail Alfredo | All concepts: Menu & Order; POS | 1448 × 1086 px | 4:3 |
| dish-oxtail-grits.png | Oxtail & Grits — uploaded photo | All concepts: Menu & Order; POS<br>after-hours/Home<br>golden-hour/Home<br>mimosa-pop/Home | 1374 × 1145 px (supplied) | 6:5 (supplied) |
| dish-pork-chop-fries.png | Pork Chop & Fries | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-potatoes-onions.png | Potatoes & Onions | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-red-velvet-cake.png | Red Velvet Cake | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-red-velvet-waffle.png | Red Velvet Waffle | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-salmon-bites-grits.png | Salmon Bites & Grits | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-seafood-basket.png | Seafood Basket | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-shrimp-grits.png | Shrimp & Grits — uploaded photo | All concepts: Menu & Order; POS<br>after-hours/Home<br>start-here/after-hours/After Hours — Home (dark)-html/AfterHours-Home.dc.html<br>start-here/after-hours/After Hours — Home (light)-html/AfterHours-Home.dc.html<br>start-here/after-hours/After Hours — Instagram-html/AfterHours-Instagram.dc.html<br>golden-hour/Home<br>start-here/golden-hour/Golden Hour — Home (dark)-html/GoldenHour-Home.dc.html<br>start-here/golden-hour/Golden Hour — Home (light)-html/GoldenHour-Home.dc.html<br>start-here/golden-hour/Golden Hour — Instagram-html/GoldenHour-Instagram.dc.html<br>mimosa-pop/Home<br>start-here/mimosa-pop/Mimosa Pop — Home (dark)-html/MimosaPop-Home.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Home (light)-html/MimosaPop-Home.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Instagram-html/MimosaPop-Instagram.dc.html | 1448 × 1086 px (supplied) | 4:3 |
| dish-side-of-fruit.png | Side of Fruit | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-snapper-eggs-potatoes.png | Snapper, Eggs & Potatoes — uploaded photo | All concepts: Menu & Order; POS | 1536 × 1024 px (supplied) | 3:2 (supplied) |
| dish-strawberry-banana-cream-french-toast.png | Strawberry & Banana Cream French Toast | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-strawberry-cream-waffle.png | Strawberry & Cream Waffle | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-strawberry-cream.png | Strawberry & Cream | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| dish-sunrise-breakfast.png | Sunrise Breakfast | All concepts: Menu & Order; POS | 1086 × 1448 px | 3:4 |
| dish-wings-fries.png | Wings & Fries | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| drink-blue-hawaiian-breeze.jpg | Blue Hawaiian Breeze | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-bottled-water.jpg | Bottled Water | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-brunch-way-mimosa.jpg | Brunch Way Mimosa | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-classic-mimosa.png | Classic Mimosa | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| drink-coconut-rum-punch.jpg | Coconut Rum Punch | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-coffee.jpg | Coffee | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-dragon-fruit-mimosa-tower.jpg | Dragon Fruit Mimosa Tower | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-dragon-fruit-mimosa.jpg | Dragon Fruit Mimosa | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-fresh-orange-juice.jpg | Fresh Orange Juice | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-hennessy-lemonade.jpg | Hennessy Lemonade | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-hibiscus-mojito.jpg | Hibiscus Mojito | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-hot-tea.jpg | Hot Tea | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-iced-coffee.jpg | Iced Coffee | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-lavender-french-75.jpg | Lavender French 75 | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-lavender-mimosa-tower.jpg | Lavender Mimosa Tower | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-lemonade.jpg | Lemonade | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-lychee-martini.jpg | Lychee Martini | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-mango-mimosa-tower.jpg | Mango Mimosa Tower | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-mango-mimosa.png | Mango Mimosa | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| drink-margarita-mimosa.jpg | Margarita Mimosa | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-peach-bellini.jpg | Peach Bellini | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-peach-mimosa.png | Peach Mimosa | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| drink-pineapple-mimosa-tower.jpg | Pineapple Mimosa Tower | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-pineapple-mimosa.png | Pineapple Mimosa | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| drink-sodas.jpg | Sodas | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-spicy-bloody-mary.jpg | Spicy Bloody Mary | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-strawberry-lemonade-mimosa.jpg | Strawberry Lemonade Mimosa | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-strawberry-lemonade.jpg | Strawberry Lemonade | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-bottomless-mimosas.png | Bottomless mimosas — uploaded photo | All concepts: Menu & Order; POS<br>start-here/mimosa-pop/Mimosa Pop — Home (light)-html/MimosaPop-Home.dc.html (hero)<br>start-here/golden-hour/Golden Hour — Home (light)-html/GoldenHour-Home.dc.html (Bottomless, all day long) | 2170 × 725 px (supplied) | ~3:1 |
| drink-strawberry-mimosa-tower.png | Strawberry Mimosa Tower — uploaded photo | All concepts: Menu & Order; POS<br>start-here/after-hours/After Hours — Home (dark)-html/AfterHours-Home.dc.html<br>start-here/after-hours/After Hours — Instagram-html/AfterHours-Instagram.dc.html<br>start-here/golden-hour/Golden Hour — Home (light)-html/GoldenHour-Home.dc.html | 1122 × 1402 px (supplied) | 4:5 (supplied) |
| drink-strawberry-mimosa.png | Strawberry Mimosa | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| drink-strawberry-reposado-fizz.jpg | Strawberry Reposado Fizz | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-tequila-sunrise.jpg | Tequila Sunrise | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-tiffany-mimosa.jpg | Tiffany Mimosa | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-tropical-breeze.jpg | Tropical Breeze | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-tropical-punch.jpg | Tropical Punch | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-virgin-sunrise.jpg | Virgin Sunrise | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-watermelon-cooler.jpg | Watermelon Cooler | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-watermelon-mimosa-tower.jpg | Watermelon Mimosa Tower | All concepts: Menu & Order; POS | 1600 × 1200 px | 4:3 |
| drink-watermelon-mimosa.png | Watermelon Mimosa | All concepts: Menu & Order; POS | 1536 × 1024 px | 3:2 |
| ig-post-01.jpg | Just Brunch Instagram photo 1 | start-here/after-hours/After Hours — Home (dark)-html/AfterHours-Home.dc.html<br>start-here/after-hours/After Hours — Home (light)-html/AfterHours-Home.dc.html<br>start-here/after-hours/After Hours — Instagram-html/AfterHours-Instagram.dc.html<br>start-here/golden-hour/Golden Hour — Home (dark)-html/GoldenHour-Home.dc.html<br>start-here/golden-hour/Golden Hour — Home (light)-html/GoldenHour-Home.dc.html<br>start-here/golden-hour/Golden Hour — Instagram-html/GoldenHour-Instagram.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Home (dark)-html/MimosaPop-Home.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Home (light)-html/MimosaPop-Home.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Instagram-html/MimosaPop-Instagram.dc.html | 1600 × 1600 px | 1:1 |
| ig-post-02.jpg | Just Brunch Instagram photo 2 | start-here/after-hours/After Hours — Home (dark)-html/AfterHours-Home.dc.html<br>start-here/after-hours/After Hours — Home (light)-html/AfterHours-Home.dc.html<br>start-here/golden-hour/Golden Hour — Home (dark)-html/GoldenHour-Home.dc.html<br>start-here/golden-hour/Golden Hour — Home (light)-html/GoldenHour-Home.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Home (dark)-html/MimosaPop-Home.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Home (light)-html/MimosaPop-Home.dc.html | 1600 × 1600 px | 1:1 |
| ig-post-03.jpg | Just Brunch Instagram photo 3 | start-here/after-hours/After Hours — Home (dark)-html/AfterHours-Home.dc.html<br>start-here/after-hours/After Hours — Home (light)-html/AfterHours-Home.dc.html<br>start-here/golden-hour/Golden Hour — Home (dark)-html/GoldenHour-Home.dc.html<br>start-here/golden-hour/Golden Hour — Home (light)-html/GoldenHour-Home.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Home (dark)-html/MimosaPop-Home.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Home (light)-html/MimosaPop-Home.dc.html | 1600 × 1600 px | 1:1 |
| ig-post-04.jpg | Just Brunch Instagram photo 4 | start-here/after-hours/After Hours — Home (dark)-html/AfterHours-Home.dc.html<br>start-here/after-hours/After Hours — Home (light)-html/AfterHours-Home.dc.html<br>start-here/golden-hour/Golden Hour — Home (dark)-html/GoldenHour-Home.dc.html<br>start-here/golden-hour/Golden Hour — Home (light)-html/GoldenHour-Home.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Home (dark)-html/MimosaPop-Home.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Home (light)-html/MimosaPop-Home.dc.html | 1600 × 1600 px | 1:1 |
| ig-post-05.jpg | Just Brunch Instagram photo 5 | start-here/after-hours/After Hours — Home (dark)-html/AfterHours-Home.dc.html<br>start-here/after-hours/After Hours — Home (light)-html/AfterHours-Home.dc.html<br>start-here/golden-hour/Golden Hour — Home (dark)-html/GoldenHour-Home.dc.html<br>start-here/golden-hour/Golden Hour — Home (light)-html/GoldenHour-Home.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Home (dark)-html/MimosaPop-Home.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Home (light)-html/MimosaPop-Home.dc.html | 1600 × 1600 px | 1:1 |
| ig-post-06.jpg | Just Brunch Instagram photo 6 | start-here/after-hours/After Hours — Home (dark)-html/AfterHours-Home.dc.html<br>start-here/after-hours/After Hours — Home (light)-html/AfterHours-Home.dc.html<br>start-here/golden-hour/Golden Hour — Home (dark)-html/GoldenHour-Home.dc.html<br>start-here/golden-hour/Golden Hour — Home (light)-html/GoldenHour-Home.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Home (dark)-html/MimosaPop-Home.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Home (light)-html/MimosaPop-Home.dc.html | 1600 × 1600 px | 1:1 |
| restaurant-crew.png | Crew — good energy, uploaded photo | after-hours/Home atmosphere section (light and dark modes) | 1448 × 1086 px (supplied) | 4:3 |
| restaurant-dining-room.png | Teal booths and brick dining room — uploaded photo | start-here/after-hours/After Hours — Home (dark)-html/AfterHours-Home.dc.html (hero vibe tile)<br>start-here/golden-hour/Golden Hour — Home (light)-html/GoldenHour-Home.dc.html (hero dining room)<br>start-here/mimosa-pop/Mimosa Pop — Home (light)-html/MimosaPop-Home.dc.html (hero Vibes tile) | 1448 × 1086 px (supplied) | 4:3 |
| restaurant-celebration.png | Friends celebrating over brunch — uploaded photo | after-hours/Home atmosphere section (light and dark modes) | 1448 × 1086 px (supplied) | 4:3 |
| suite-behold-green.jpg | Behold Green Room | start-here/after-hours/After Hours — Private Dining Suites-html/AfterHours-Suites.dc.html<br>start-here/golden-hour/Golden Hour — Private Dining Suites-html/GoldenHour-Suites.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Private Dining Suites-html/MimosaPop-Suites.dc.html | 1600 × 1200 px | 4:3 |
| suite-cheers-red-roses.jpg | Cheers Red Roses | start-here/after-hours/After Hours — Private Dining Suites-html/AfterHours-Suites.dc.html<br>start-here/golden-hour/Golden Hour — Private Dining Suites-html/GoldenHour-Suites.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Private Dining Suites-html/MimosaPop-Suites.dc.html | 1600 × 1200 px | 4:3 |
| suite-ig-pink.jpg | IG Pink Room | start-here/after-hours/After Hours — Private Dining Suites-html/AfterHours-Suites.dc.html<br>start-here/golden-hour/Golden Hour — Private Dining Suites-html/GoldenHour-Suites.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Private Dining Suites-html/MimosaPop-Suites.dc.html | 1600 × 1200 px | 4:3 |
| suite-va-leagues.jpg | VA Leagues Room | start-here/after-hours/After Hours — Private Dining Suites-html/AfterHours-Suites.dc.html<br>start-here/golden-hour/Golden Hour — Private Dining Suites-html/GoldenHour-Suites.dc.html<br>start-here/mimosa-pop/Mimosa Pop — Private Dining Suites-html/MimosaPop-Suites.dc.html | 1600 × 1200 px | 4:3 |
| window-table.jpg | window table | start-here/golden-hour/Golden Hour — Reserve-html/GoldenHour-Reserve.dc.html | 1600 × 1200 px | 4:3 |
