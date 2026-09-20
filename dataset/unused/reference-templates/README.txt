Curated reference lists from the original dataset/JSON_Files folder.

Not wired into the application, for two reasons:
  1. No code path ever read this folder.
  2. They are schema skeletons, not data. Nakshatra-List holds 1 of 27 nakshatras,
     Tithi-List 2 of 30, House-List 2 of 12, and 34 of the 68 files contain a
     single sample record.

The populated equivalents the engine actually uses live in dataset/used/core
(for example nakshatra_basic_list.json with all 27, tithi_details.json with all 30).

Populate a file here and move it to dataset/used/core to bring it into service;
the catalogue and resolver pick up new files in a bucket automatically.
