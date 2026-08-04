# Requirement Customer, Product, dan Invoice

## Customer

Seorang Product Owner ingin membuat fitur master customer pada sistem invoice perusahaan. User yang terlibat adalah Admin yang sudah login dan berhak mengelola data customer. Admin dapat melihat daftar customer, membuat customer baru, melihat detail customer, mengubah data customer, mengubah status customer menjadi Active atau Inactive, serta menghapus customer yang belum pernah digunakan pada invoice.

Beberapa data customer yang harus ada adalah Customer Code, Customer Name, Email, Phone, Address, dan Status. Customer Code bersifat unique sehingga tidak boleh ada dua customer dengan kode yang sama. Ketika Admin menginputkan Customer Code dengan huruf kecil, sistem akan menyimpan kode tersebut dalam huruf besar. Customer Name wajib diisi dengan minimal 3 karakter dan maksimal 150 karakter. Email wajib diisi menggunakan format email yang valid. Phone bersifat opsional, tetapi jika diisi hanya boleh berisi angka, tanda plus, spasi, tanda hubung, dan tanda kurung. Address wajib diisi dan maksimal 500 karakter.

Secara user experience, status customer dapat diatur sebagai Active atau Inactive. Customer yang berstatus Inactive tidak akan muncul saat Admin membuat invoice, sehingga hanya customer aktif yang dapat digunakan untuk transaksi. Jika customer sudah pernah digunakan pada invoice, Admin tidak dapat menghapus customer tersebut. Jika tetap mencoba menghapus, sistem akan menampilkan warning bahwa customer sudah digunakan pada invoice dan Admin dapat mengubah status customer menjadi Inactive.

## Product

Seorang Product Owner ingin membuat fitur master product pada sistem invoice perusahaan. User yang terlibat adalah Admin yang sudah login dan berhak mengelola data product. Admin dapat melihat daftar product, membuat product baru, melihat detail product, mengubah data product, mengubah status product menjadi Active atau Inactive, serta menghapus product yang belum pernah digunakan pada invoice.

Beberapa data product yang harus ada adalah Product Code, Product Name, Price, Initial Stock, Available Stock, dan Status. Product Code bersifat unique sehingga tidak boleh ada dua product dengan kode yang sama. Ketika Admin menginputkan Product Code dengan huruf kecil, sistem akan menyimpan kode tersebut dalam huruf besar. Product Name wajib diisi dengan minimal 3 karakter dan maksimal 150 karakter. Price wajib bernilai lebih dari 0. Initial Stock wajib diisi dalam bentuk bilangan bulat dan tidak boleh bernilai negatif.

Saat Admin membuat product baru, Available Stock akan otomatis sama dengan Initial Stock. Ketika Admin mengubah Initial Stock, sistem akan menyesuaikan Available Stock berdasarkan selisih Initial Stock lama dan Initial Stock baru. Jika Initial Stock dinaikkan, Available Stock ikut bertambah sesuai selisihnya. Jika Initial Stock diturunkan, Available Stock ikut berkurang sesuai selisihnya. Available Stock tidak boleh bernilai negatif, sehingga sistem harus menolak perubahan Initial Stock yang membuat Available Stock menjadi kurang dari 0.

Secara user experience, product yang berstatus Inactive tidak akan muncul saat Admin membuat invoice, sehingga hanya product aktif yang dapat digunakan untuk transaksi. Jika product sudah pernah digunakan pada invoice item, Admin tidak dapat menghapus product tersebut. Jika tetap mencoba menghapus, sistem akan menampilkan warning bahwa product sudah digunakan pada invoice dan Admin dapat mengubah status product menjadi Inactive.

## Invoice

Seorang Product Owner ingin membuat fitur invoice pada sistem perusahaan. User yang terlibat adalah Admin yang sudah login dan berhak membuat serta memproses invoice. Admin dapat melihat daftar invoice, membuat invoice baru, melihat detail invoice, menyimpan invoice sebagai draft, submit invoice, menandai invoice sebagai paid, dan membatalkan invoice selama invoice masih berstatus draft.

Beberapa data invoice yang harus ada adalah Invoice Number, Customer, Customer Address, Issue Date, Due Date, Additional Info, Product Item, Quantity, Unit Price, Discount, Subtotal, Total Discount, Tax, Grand Total, dan Status. Invoice Number tidak diinput manual oleh Admin karena sistem akan membuat nomor invoice secara otomatis saat invoice disimpan. Customer wajib dipilih dari daftar customer aktif. Ketika Admin memilih customer, Customer Address akan muncul otomatis pada field dan Admin tidak dapat mengubahnya secara manual pada form invoice.

Invoice wajib memiliki minimal satu product item. Product item wajib dipilih dari daftar product aktif. Product yang sama tidak boleh dipilih lebih dari satu kali dalam satu invoice. Ketika Admin memilih product, Unit Price akan muncul otomatis mengikuti harga product dan informasi Available Stock akan ditampilkan. Quantity wajib berupa bilangan bulat minimal 1 dan tidak boleh melebihi Available Stock product. Discount diinput dalam persen dan hanya boleh bernilai 0 sampai 100.

Issue Date dan Due Date wajib diisi. Due Date tidak boleh lebih awal dari Issue Date. Jika Admin menginputkan Due Date sebelum Issue Date, sistem akan menampilkan warning dan invoice tidak berhasil disimpan. Additional Info bersifat opsional dan maksimal 500 karakter.

Sistem akan menghitung subtotal, total discount, tax 11%, dan grand total secara otomatis berdasarkan product, quantity, price, dan discount yang diinputkan. Invoice yang baru dibuat akan tersimpan dengan status DRAFT. Invoice DRAFT masih dapat diedit, dihapus, disubmit, atau dibatalkan.

Ketika Admin melakukan submit invoice, sistem harus memastikan invoice masih berstatus DRAFT, product masih aktif, dan Available Stock masih mencukupi. Jika semua data valid, status invoice berubah menjadi SUBMITTED dan Available Stock product akan berkurang sesuai quantity pada invoice item. Available Stock tidak boleh menjadi negatif. Jika stock tidak cukup, sistem akan menampilkan warning, invoice tidak berhasil disubmit, dan status invoice tetap DRAFT.

Invoice yang sudah berstatus SUBMITTED tidak dapat diedit atau dihapus. Invoice SUBMITTED dapat ditandai sebagai PAID. Invoice hanya dapat dibatalkan ketika masih berstatus DRAFT. Setiap perubahan status invoice harus disimpan sebagai histori agar Admin dapat mengetahui riwayat proses invoice.
