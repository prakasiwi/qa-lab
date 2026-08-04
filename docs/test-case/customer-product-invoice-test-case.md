# Test Case Customer, Product, dan Invoice

## Customer

| ID | Scenario | Precondition | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| TC-CUS-001 | Membuat customer valid | Admin sudah login | Buka Customers, klik Create Customer, isi data valid, klik Create Customer | Customer berhasil dibuat, tampil pesan sukses, dan user diarahkan ke detail customer |
| TC-CUS-002 | Customer Code otomatis uppercase | Admin sudah login | Buat customer dengan code `cust-qa-001` | Customer tersimpan dengan code `CUST-QA-001` |
| TC-CUS-003 | Customer Code wajib unik | Sudah ada customer `CUST-001` | Buat customer lain dengan code `CUST-001` | Sistem menampilkan error `Customer Code sudah digunakan` |
| TC-CUS-004 | Customer Name kurang dari 3 karakter | Admin sudah login | Isi Customer Name dengan 2 karakter, lalu simpan | Sistem menampilkan validasi minimal 3 karakter dan data tidak tersimpan |
| TC-CUS-005 | Email tidak valid | Admin sudah login | Isi email tanpa format email valid, lalu simpan | Sistem menampilkan validasi email tidak valid dan data tidak tersimpan |
| TC-CUS-006 | Phone berisi karakter tidak valid | Admin sudah login | Isi Phone dengan huruf, lalu simpan | Sistem menampilkan validasi phone dan data tidak tersimpan |
| TC-CUS-007 | Address lebih dari 500 karakter | Admin sudah login | Isi Address lebih dari 500 karakter, lalu simpan | Sistem menampilkan validasi maksimal 500 karakter |
| TC-CUS-008 | Customer inactive tidak muncul di invoice | Ada customer Inactive | Buka Create Invoice dan buka pilihan customer | Customer Inactive tidak tersedia pada dropdown |
| TC-CUS-009 | Menghapus customer yang belum digunakan | Ada customer tanpa invoice | Klik Delete pada customer dan konfirmasi | Customer berhasil dihapus dari daftar |
| TC-CUS-010 | Menghapus customer yang sudah digunakan | Ada customer yang sudah digunakan invoice | Klik Delete pada customer dan konfirmasi | Sistem menolak penghapusan dan menampilkan pesan customer sudah digunakan pada invoice |

## Product

| ID | Scenario | Precondition | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| TC-PRD-001 | Membuat product valid | Admin sudah login | Buka Products, klik Create Product, isi data valid, klik Create Product | Product berhasil dibuat, tampil pesan sukses, dan user diarahkan ke detail product |
| TC-PRD-002 | Product Code otomatis uppercase | Admin sudah login | Buat product dengan code `prod-qa-001` | Product tersimpan dengan code `PROD-QA-001` |
| TC-PRD-003 | Product Code wajib unik | Sudah ada product `PROD-001` | Buat product lain dengan code `PROD-001` | Sistem menampilkan error `Product Code sudah digunakan` |
| TC-PRD-004 | Price wajib lebih dari 0 | Admin sudah login | Isi Price `0` atau negatif, lalu simpan | Sistem menampilkan validasi Price wajib lebih dari 0 |
| TC-PRD-005 | Initial Stock tidak boleh negatif | Admin sudah login | Isi Initial Stock `-1`, lalu simpan | Sistem menampilkan validasi Initial Stock tidak boleh negatif |
| TC-PRD-006 | Initial Stock harus integer | Admin sudah login | Isi Initial Stock `1.5`, lalu simpan | Sistem menampilkan validasi Initial Stock harus bilangan bulat |
| TC-PRD-007 | Available Stock otomatis saat create | Admin sudah login | Buat product dengan Initial Stock `10` | Product tersimpan dengan Initial Stock `10` dan Available Stock `10` |
| TC-PRD-008 | Edit Initial Stock menambah Available Stock | Product memiliki Initial Stock `10` dan Available Stock `8` | Ubah Initial Stock menjadi `15`, lalu simpan | Available Stock menjadi `13` |
| TC-PRD-009 | Edit Initial Stock mengurangi Available Stock | Product memiliki Initial Stock `10` dan Available Stock `8` | Ubah Initial Stock menjadi `9`, lalu simpan | Available Stock menjadi `7` |
| TC-PRD-010 | Edit Initial Stock ditolak jika stock menjadi negatif | Product memiliki Initial Stock `10` dan Available Stock `2` | Ubah Initial Stock menjadi `7`, lalu simpan | Sistem menolak perubahan karena Available Stock menjadi negatif |
| TC-PRD-011 | Product inactive tidak muncul di invoice | Ada product Inactive | Buka Create Invoice dan buka pilihan product | Product Inactive tidak tersedia pada dropdown |
| TC-PRD-012 | Menghapus product yang sudah digunakan | Ada product yang sudah digunakan invoice item | Klik Delete pada product dan konfirmasi | Sistem menolak penghapusan dan menampilkan pesan product sudah digunakan pada invoice |

## Invoice

| ID | Scenario | Precondition | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| TC-INV-001 | Membuat invoice draft valid | Ada customer aktif dan product aktif dengan stock cukup | Buka Create Invoice, pilih customer, isi tanggal valid, pilih product, isi quantity dan discount valid, klik Save as Draft | Invoice berhasil dibuat dengan status DRAFT dan Invoice Number otomatis |
| TC-INV-002 | Customer address otomatis tampil | Ada customer aktif dengan address | Pilih customer pada Create Invoice | Customer Address tampil otomatis dan field tidak dapat diedit |
| TC-INV-003 | Unit price otomatis tampil | Ada product aktif dengan price | Pilih product pada item invoice | Unit Price tampil sesuai price product |
| TC-INV-004 | Due Date sebelum Issue Date | Admin berada di Create Invoice | Isi Due Date lebih awal dari Issue Date, lalu simpan | Sistem menampilkan validasi Due Date tidak boleh sebelum Issue Date |
| TC-INV-005 | Invoice tanpa customer | Admin berada di Create Invoice | Kosongkan Customer, isi field lain valid, lalu simpan | Sistem menampilkan validasi Customer wajib dipilih |
| TC-INV-006 | Invoice tanpa product | Admin berada di Create Invoice | Kosongkan Product pada item, lalu simpan | Sistem menampilkan validasi Produk wajib dipilih |
| TC-INV-007 | Product duplikat dalam satu invoice | Ada minimal 1 product aktif | Tambahkan dua baris item dan pilih product yang sama, lalu simpan | Sistem menampilkan validasi Produk tidak boleh duplikat |
| TC-INV-008 | Quantity kurang dari 1 | Ada product aktif | Isi quantity `0`, lalu simpan | Sistem menampilkan validasi Quantity minimal 1 dan integer |
| TC-INV-009 | Quantity bukan integer | Ada product aktif | Isi quantity `1.5`, lalu simpan | Sistem menampilkan validasi Quantity minimal 1 dan integer |
| TC-INV-010 | Quantity melebihi Available Stock | Product memiliki Available Stock `5` | Isi quantity `6`, lalu simpan | Sistem menampilkan validasi Quantity tidak boleh melebihi Available Stock |
| TC-INV-011 | Discount kurang dari 0 | Ada product aktif | Isi discount `-1`, lalu simpan | Sistem menampilkan validasi Discount 0 sampai 100 |
| TC-INV-012 | Discount lebih dari 100 | Ada product aktif | Isi discount `101`, lalu simpan | Sistem menampilkan validasi Discount 0 sampai 100 |
| TC-INV-013 | Perhitungan total invoice | Product price `100000`, quantity `2`, discount `10%`, tax `11%` | Pilih product dan isi data tersebut | Subtotal `200000`, Total Discount `20000`, Tax `19800`, Grand Total `199800` |
| TC-INV-014 | Submit invoice draft | Ada invoice DRAFT dan stock cukup | Buka detail invoice, klik Submit Invoice, konfirmasi | Status berubah menjadi SUBMITTED dan Available Stock product berkurang sesuai quantity |
| TC-INV-015 | Submit ditolak saat stock tidak cukup | Ada invoice DRAFT, tetapi Available Stock product sudah lebih kecil dari quantity invoice | Klik Submit Invoice | Sistem menolak submit dan status tetap DRAFT |
| TC-INV-016 | Edit invoice submitted ditolak | Ada invoice SUBMITTED | Kirim perubahan invoice melalui API atau buka alur edit jika tersedia | Sistem menolak perubahan invoice |
| TC-INV-017 | Delete invoice draft | Ada invoice DRAFT | Hapus invoice melalui API | Invoice berhasil dihapus |
| TC-INV-018 | Delete invoice submitted ditolak | Ada invoice SUBMITTED | Hapus invoice melalui API | Sistem menolak penghapusan |
| TC-INV-019 | Mark as paid | Ada invoice SUBMITTED | Buka detail invoice, klik Mark as Paid, konfirmasi | Status berubah menjadi PAID |
| TC-INV-020 | Cancel invoice draft | Ada invoice DRAFT | Buka detail invoice, klik Cancel Invoice, konfirmasi | Status berubah menjadi CANCELLED |
| TC-INV-021 | Cancel invoice non-draft ditolak | Ada invoice SUBMITTED atau PAID | Kirim request cancel invoice | Sistem menolak pembatalan |
| TC-INV-022 | Histori invoice tercatat | Ada invoice yang dibuat dan disubmit | Buka atau panggil histori invoice | Histori berisi aksi CREATED dan SUBMIT dengan status yang sesuai |
