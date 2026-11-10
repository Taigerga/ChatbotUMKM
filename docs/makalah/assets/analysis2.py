import pandas as pd
raw = 'data/raw/'
m = pd.read_csv(raw + 'customer_master.csv', usecols=['customer_id'])
t = pd.read_csv(raw + 'ecommerce_sales_customer_analytics_150k.csv', usecols=['customer_id'])
sms = set(m.customer_id); tss = set(t.customer_id)
print('master', len(sms), 'transaksi unik', len(tss), 'master tidak bertransaksi', len(sms - tss), 'transaksi tidak di master', len(tss - sms))
ci = pd.read_csv(raw + 'customer_master.csv')
print('master dup customer_id', ci.customer_id.duplicated().sum())
print('master akuisisi dari', ci.customer_acquisition_cost.min(), ci.customer_acquisition_cost.max())
st = pd.read_csv(raw + 'product_catalog.csv')
print('product_rating min/max', st.product_rating.min(), st.product_rating.max(), 'supplier', st.supplier.nunique(), 'brand', st.brand.nunique())
print('master segments', ci.customer_segment.value_counts().to_dict())
