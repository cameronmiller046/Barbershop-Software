-- Add the hidden SUPERUSER debug role (dev team can open any store's portal).
ALTER TYPE "Role" ADD VALUE 'SUPERUSER';
