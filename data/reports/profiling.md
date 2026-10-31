# Profiling Dataset Mentah

| File | Baris | Kolom | Null tertinggi | Karakter rusak |
|---|---|---|---|---|
| customer_master.csv | 25000 | 11 | customer_id (0.0%) | 0 |
| dataset_statistics.csv | 1 | 11 | Total Transactions (0.0%) | 0 |
| ecommerce_sales_customer_analytics_150k.csv | 138116 | 46 | return_reason (93.15%) | 0 |
| order_items.csv | 397569 | 12 | order_id (0.0%) | 0 |
| product_catalog.csv | 1175 | 9 | product_id (0.0%) | 0 |

Karakter rusak > 0 berarti file bukan UTF-8 murni; pembersihan wajib memakai `encoding_errors="replace"` atau deteksi cp1252.

## customer_master

| Kolom | Tipe | Null % | Unik | Contoh | Peran |
|---|---|---|---|---|---|
| customer_id | str | 0.0 | 25000 | CUST-000001 | CUST-000002 | CUST-000003 | id |
| customer_name | str | 0.0 | 21631 | Donna Miller | Joseph James | Daniel Smi | atribut |
| customer_age | int64 | 0.0 | 57 | 54 | 61 | 47 | atribut |
| gender | str | 0.0 | 3 | Female | Male | Non-Binary | atribut |
| customer_segment | str | 0.0 | 4 | Consumer | VIP | Premium | atribut |
| customer_city | str | 0.0 | 15555 | Laurenland | Lake Peter | Seanview | atribut |
| customer_state | str | 0.0 | 38 | Dubai | Lower Saxony | North Rhine | atribut |
| customer_country | str | 0.0 | 7 | UAE | Germany | USA | atribut |
| region | str | 0.0 | 5 | South | North | West | atribut |
| customer_postal_code | int64 | 0.0 | 22183 | 11253 | 47778 | 13900 | atribut |
| customer_acquisition_cost | float64 | 0.0 | 7215 | 13.58 | 27.45 | 31.53 | nilai_uang |

## dataset_statistics

| Kolom | Tipe | Null % | Unik | Contoh | Peran |
|---|---|---|---|---|---|
| Total Transactions | int64 | 0.0 | 1 | 138116 | atribut |
| Total Columns | int64 | 0.0 | 1 | 46 | atribut |
| Total Customers | int64 | 0.0 | 1 | 24911 | atribut |
| Total Products Used | int64 | 0.0 | 1 | 138116 | atribut |
| Date Range | str | 0.0 | 1 | 2021-01-01 to 2025-12-31 | tanggal |
| Total Revenue | str | 0.0 | 1 | $177,134,263.74 | nilai_uang |
| Total Profit | str | 0.0 | 1 | $76,146,395.76 | nilai_uang |
| Average Order Value | str | 0.0 | 1 | $1,282.50 | nilai_uang |
| Average Rating | float64 | 0.0 | 1 | 3.68 | nilai_uang |
| Return Rate | str | 0.0 | 1 | 6.85% | atribut |
| Cancellation Rate | str | 0.0 | 1 | 6.08% | atribut |

## ecommerce_sales_customer_analytics_150k

| Kolom | Tipe | Null % | Unik | Contoh | Peran |
|---|---|---|---|---|---|
| order_id | str | 0.0 | 138116 | ORD-301242 | ORD-773460 | ORD-449374 | id |
| order_date | str | 0.0 | 1826 | 2023-11-06 | 2025-12-24 | 2021-07-05 | tanggal |
| order_time | str | 0.0 | 68991 | 16:37:47 | 01:22:36 | 14:24:21 | atribut |
| order_status | str | 0.0 | 4 | Completed | Pending | Cancelled | atribut |
| sales_channel | str | 0.0 | 4 | Mobile App | Website | Social Media | nilai_uang |
| customer_id | str | 0.0 | 24911 | CUST-003102 | CUST-003124 | CUST-012496 | id |
| customer_name | str | 0.0 | 21564 | Jasmine Ryan | Scott Chase | Marc Wheele | atribut |
| customer_age | int64 | 0.0 | 57 | 55 | 26 | 69 | atribut |
| gender | str | 0.0 | 3 | Male | Female | Non-Binary | atribut |
| customer_segment | str | 0.0 | 4 | Consumer | Premium | VIP | atribut |
| customer_type | str | 0.0 | 3 | Loyal | Returning | New | atribut |
| customer_city | str | 0.0 | 15516 | Lake Williamberg | Kristyport | Singleto | atribut |
| customer_state | str | 0.0 | 38 | Texas | Baden-Württemberg | New York | atribut |
| customer_country | str | 0.0 | 7 | USA | Germany | India | atribut |
| region | str | 0.0 | 5 | South | East | West | atribut |
| customer_postal_code | int64 | 0.0 | 22117 | 86040 | 62538 | 19993 | atribut |
| payment_method | str | 0.0 | 7 | Digital Wallet | Debit Card | Cash on De | atribut |
| payment_status | str | 0.0 | 4 | Paid | Pending | Failed | atribut |
| currency | str | 0.0 | 7 | USD | EUR | INR | atribut |
| shipping_method | str | 0.0 | 4 | Standard | Economy | Express | atribut |
| warehouse | str | 0.0 | 19 | WH-003 | WH-005 | WH-015 | atribut |
| delivery_days | float64 | 17.78 | 15 | 3.0 | 10.0 | 2.0 | atribut |
| estimated_delivery_days | float64 | 17.78 | 11 | 3.0 | 10.0 | 2.0 | atribut |
| delivery_status | str | 0.0 | 4 | On Time | Delayed | Cancelled | atribut |
| return_status | str | 93.15 | 1 | Returned | atribut |
| return_reason | str | 93.15 | 8 | Wrong Product | Defective Product | Size | atribut |
| customer_rating | float64 | 17.78 | 35 | 3.5 | 3.6 | 4.3 | nilai_uang |
| review_sentiment | str | 17.78 | 3 | Positive | Neutral | Negative | atribut |
| customer_review | str | 17.78 | 25 | Satisfied with the purchase. | Good valu | atribut |
| marketing_channel | str | 0.0 | 10 | Direct | YouTube | Email Marketing | atribut |
| campaign_name | str | 60.26 | 17 | Default_Campaign | Friend_Invite | Googl | atribut |
| coupon_code | str | 80.01 | 40 | SAVE31 | SAVE15 | SAVE30 | atribut |
| loyalty_points_earned | int64 | 0.0 | 846 | 94 | 201 | 46 | atribut |
| loyalty_points_redeemed | int64 | 0.0 | 642 | 44 | 171 | 16 | atribut |
| quantity | int64 | 0.0 | 24 | 5 | 8 | 2 | kuantitas |
| gross_sales | float64 | 0.0 | 102538 | 1350.19 | 3144.64 | 522.81 | nilai_uang |
| discount_amount | float64 | 0.0 | 64513 | 477.89 | 1456.0600000000002 | 97.3 | nilai_uang |
| tax_amount | float64 | 0.0 | 49921 | 61.07 | 320.83 | 29.79 | nilai_uang |
| shipping_cost | float64 | 0.0 | 14857 | 12.030000000000001 | 9.0 | 13.05 | nilai_uang |
| net_sales | float64 | 0.0 | 115457 | 945.4 | 2018.4099999999999 | 468.35 | nilai_uang |
| product_cost | float64 | 0.0 | 92646 | 588.33 | 2031.88 | 257.73 | nilai_uang |
| profit | float64 | 0.0 | 96545 | 345.03999999999996 | -22.470000000000006 | nilai_uang |
| profit_margin_percentage | float64 | 0.0 | 7947 | 36.5 | -1.11 | 42.18 | nilai_uang |
| customer_lifetime_value | float64 | 0.0 | 24769 | 12459.68 | 13032.480000000001 | 6159.440 | nilai_uang |
| is_repeat_customer | bool | 0.0 | 2 | True | False | atribut |
| customer_order_count | int64 | 0.0 | 19 | 11 | 6 | 7 | atribut |

## order_items

| Kolom | Tipe | Null % | Unik | Contoh | Peran |
|---|---|---|---|---|---|
| order_id | str | 0.0 | 138116 | ORD-301242 | ORD-773460 | ORD-449374 | id |
| product_id | str | 0.0 | 1175 | PROD-000738 | PROD-000181 | PROD-000973 | id |
| quantity | int64 | 0.0 | 5 | 2 | 3 | 4 | kuantitas |
| unit_price | float64 | 0.0 | 1164 | 244.4 | 287.13 | 754.8 | nilai_uang |
| discount_percentage | float64 | 0.0 | 343634 | 0.33960729091410474 | 0.3620758795418163 | atribut |
| discount_amount | float64 | 0.0 | 50505 | 166.0 | 311.89 | 1413.89 | nilai_uang |
| gross_sales | float64 | 0.0 | 5724 | 488.8 | 861.39 | 3019.2 | nilai_uang |
| tax_amount | float64 | 0.0 | 29348 | 22.6 | 38.47 | 305.01 | nilai_uang |
| shipping_cost | float64 | 0.0 | 2948 | 6.48 | 5.55 | 9.0 | nilai_uang |
| net_sales | float64 | 0.0 | 125944 | 351.88 | 593.52 | 1919.32 | nilai_uang |
| product_cost | float64 | 0.0 | 5516 | 173.28 | 415.05 | 1976.16 | nilai_uang |
| profit | float64 | 0.0 | 78190 | 172.12 | 172.92 | -65.84 | nilai_uang |

## product_catalog

| Kolom | Tipe | Null % | Unik | Contoh | Peran |
|---|---|---|---|---|---|
| product_id | str | 0.0 | 1175 | PROD-000001 | PROD-000002 | PROD-000003 | id |
| product_name | str | 0.0 | 1175 | Apple Sharable bifurcated algorithm Smar | atribut |
| product_category | str | 0.0 | 15 | Electronics | Home Appliances | Fashion | atribut |
| product_subcategory | str | 0.0 | 117 | Smartphones | Laptops | Tablets | atribut |
| brand | str | 0.0 | 144 | Apple | Google | LG | atribut |
| supplier | str | 0.0 | 10 | Alibaba | Euro Logistics | Asian Manufac | atribut |
| unit_price | float64 | 0.0 | 1164 | 686.9 | 978.26 | 275.51 | nilai_uang |
| product_cost | float64 | 0.0 | 1147 | 474.06 | 519.66 | 185.48 | nilai_uang |
| product_rating | float64 | 0.0 | 25 | 4.3 | 2.9 | 3.9 | nilai_uang |
