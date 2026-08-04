# Acceptance Criteria Customer, Product, dan Invoice

## Customer

### AC-CUS-001 Membuat Customer Baru

Given Admin berada pada halaman Create Customer  
When Admin mengisi Customer Code, Customer Name, Email, Address, dan Status dengan data valid  
Then sistem berhasil menyimpan customer  
And Customer Code disimpan dalam huruf besar  
And customer tampil pada daftar customer.

### AC-CUS-002 Validasi Data Customer

Given Admin berada pada halaman Create Customer atau Edit Customer  
When Admin mengosongkan field wajib atau mengisi data tidak sesuai aturan  
Then sistem menampilkan pesan validasi  
And customer tidak berhasil disimpan.

### AC-CUS-003 Customer Code Unik

Given sudah ada customer dengan Customer Code tertentu  
When Admin membuat atau mengubah customer lain dengan Customer Code yang sama  
Then sistem menolak penyimpanan  
And sistem menampilkan pesan bahwa Customer Code sudah digunakan.

### AC-CUS-004 Customer Inactive Tidak Dapat Dipakai di Invoice

Given customer berstatus Inactive  
When Admin membuka halaman Create Invoice  
Then customer tersebut tidak muncul pada pilihan customer.

### AC-CUS-005 Customer Terpakai Tidak Dapat Dihapus

Given customer sudah digunakan pada invoice  
When Admin menghapus customer tersebut  
Then sistem menolak penghapusan  
And sistem menyarankan perubahan status menjadi Inactive.

## Product

### AC-PRD-001 Membuat Product Baru

Given Admin berada pada halaman Create Product  
When Admin mengisi Product Code, Product Name, Price, Initial Stock, dan Status dengan data valid  
Then sistem berhasil menyimpan product  
And Product Code disimpan dalam huruf besar  
And Available Stock otomatis sama dengan Initial Stock.

### AC-PRD-002 Validasi Data Product

Given Admin berada pada halaman Create Product atau Edit Product  
When Admin mengosongkan field wajib, mengisi Price kurang dari atau sama dengan 0, atau mengisi Initial Stock negatif  
Then sistem menampilkan pesan validasi  
And product tidak berhasil disimpan.

### AC-PRD-003 Product Code Unik

Given sudah ada product dengan Product Code tertentu  
When Admin membuat atau mengubah product lain dengan Product Code yang sama  
Then sistem menolak penyimpanan  
And sistem menampilkan pesan bahwa Product Code sudah digunakan.

### AC-PRD-004 Perubahan Initial Stock Menyesuaikan Available Stock

Given product memiliki Initial Stock lama dan Available Stock berjalan  
When Admin mengubah Initial Stock  
Then sistem menghitung selisih Initial Stock baru dan lama  
And sistem menambahkan atau mengurangi Available Stock berdasarkan selisih tersebut.

### AC-PRD-005 Available Stock Tidak Boleh Negatif

Given sebagian stock product sudah digunakan pada invoice  
When Admin menurunkan Initial Stock sampai Available Stock menjadi negatif  
Then sistem menolak perubahan  
And product tidak berhasil disimpan.

### AC-PRD-006 Product Inactive Tidak Dapat Dipakai di Invoice

Given product berstatus Inactive  
When Admin membuka halaman Create Invoice  
Then product tersebut tidak muncul pada pilihan product.

### AC-PRD-007 Product Terpakai Tidak Dapat Dihapus

Given product sudah digunakan pada invoice item  
When Admin menghapus product tersebut  
Then sistem menolak penghapusan  
And sistem menyarankan perubahan status menjadi Inactive.

## Invoice

### AC-INV-001 Membuat Invoice Draft

Given Admin berada pada halaman Create Invoice  
When Admin memilih customer aktif, mengisi Issue Date dan Due Date valid, memilih minimal 1 product aktif, mengisi quantity valid, dan menyimpan invoice  
Then sistem berhasil membuat invoice dengan status DRAFT  
And Invoice Number dibuat otomatis  
And customer snapshot dan product snapshot tersimpan pada invoice.

### AC-INV-002 Field Otomatis di Invoice

Given Admin memilih customer pada Create Invoice  
When customer terpilih  
Then Customer Address otomatis tampil dan tidak dapat diedit manual.

Given Admin memilih product pada item invoice  
When product terpilih  
Then Unit Price otomatis mengikuti harga product  
And Available Stock product tampil sebagai informasi.

### AC-INV-003 Validasi Tanggal Invoice

Given Admin berada pada halaman Create Invoice  
When Admin mengisi Due Date sebelum Issue Date  
Then sistem menampilkan pesan validasi  
And invoice tidak berhasil disimpan.

### AC-INV-004 Validasi Item Invoice

Given Admin berada pada halaman Create Invoice  
When Admin tidak memilih product, memilih product yang sama lebih dari satu kali, mengisi quantity kurang dari 1, atau mengisi discount di luar 0 sampai 100  
Then sistem menampilkan pesan validasi  
And invoice tidak berhasil disimpan.

### AC-INV-005 Quantity Tidak Boleh Melebihi Available Stock

Given product memiliki Available Stock tertentu  
When Admin membuat invoice dengan quantity lebih besar dari Available Stock  
Then sistem menolak penyimpanan invoice  
And Available Stock product tidak berubah.

### AC-INV-006 Perhitungan Total Invoice

Given Admin mengisi product, quantity, dan discount  
When data item berubah  
Then sistem menghitung subtotal, total discount, tax 11%, dan grand total secara otomatis.

### AC-INV-007 Submit Invoice Mengurangi Stock

Given invoice berstatus DRAFT dan stock product masih cukup  
When Admin menekan Submit Invoice  
Then sistem mengubah status invoice menjadi SUBMITTED  
And Available Stock product berkurang sesuai quantity invoice item  
And histori invoice tercatat.

### AC-INV-008 Submit Invoice Ditolak Jika Stock Tidak Cukup

Given invoice berstatus DRAFT  
And Available Stock product tidak mencukupi saat submit  
When Admin menekan Submit Invoice  
Then sistem menolak submit  
And status invoice tetap DRAFT  
And Available Stock product tidak menjadi negatif.

### AC-INV-009 Invoice Submitted Tidak Dapat Diedit atau Dihapus

Given invoice sudah berstatus SUBMITTED  
When Admin mencoba mengedit atau menghapus invoice  
Then sistem menolak perubahan.

### AC-INV-010 Pembayaran Invoice

Given invoice berstatus SUBMITTED  
When Admin memilih Mark as Paid  
Then sistem mengubah status invoice menjadi PAID  
And histori invoice tercatat.

### AC-INV-011 Pembatalan Invoice

Given invoice berstatus DRAFT  
When Admin memilih Cancel Invoice  
Then sistem mengubah status invoice menjadi CANCELLED  
And histori invoice tercatat.

Given invoice bukan berstatus DRAFT  
When Admin mencoba membatalkan invoice  
Then sistem menolak pembatalan.
