ALTER TABLE "guardians"
  ADD COLUMN "postalCodeEnc" TEXT,
  ADD COLUMN "addressEnc" TEXT,
  ADD COLUMN "addressNumberEnc" TEXT,
  ADD COLUMN "complementEnc" TEXT,
  ADD COLUMN "provinceEnc" TEXT,
  ADD COLUMN "cityEnc" TEXT,
  ADD COLUMN "stateEnc" TEXT,
  ADD COLUMN "landlineEnc" TEXT,
  ADD COLUMN "additionalEmailsEnc" TEXT;

ALTER TABLE "students"
  ADD COLUMN "emailEnc" TEXT,
  ADD COLUMN "cpfEnc" TEXT,
  ADD COLUMN "mobilePhoneEnc" TEXT,
  ADD COLUMN "rgEnc" TEXT;
