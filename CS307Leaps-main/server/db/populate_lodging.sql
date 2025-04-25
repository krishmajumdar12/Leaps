INSERT INTO lodging (id, name, type, location, price_per_night, check_in_date, check_out_date, description)
VALUES
    (uuid_generate_v4(), 'Hotel California', 'Hotel', 'Los Angeles, CA', 150.00, '2025-03-01', '2025-03-05', 'A lovely place with a lovely face.'),
    (uuid_generate_v4(), 'The Grand Budapest Hotel', 'Hotel', 'Zubrowka', 200.00, '2025-04-10', '2025-04-15', 'A famous hotel with a rich history.'),
    (uuid_generate_v4(), 'The Shire Inn', 'Inn', 'Hobbiton, Shire', 80.00, '2025-05-20', '2025-05-25', 'A cozy inn located in the heart of the Shire.'),
    (uuid_generate_v4(), 'The Overlook Hotel', 'Hotel', 'Colorado, USA', 120.00, '2025-06-01', '2025-06-07', 'A historic hotel with a mysterious past.'),
    (uuid_generate_v4(), 'The Prancing Pony', 'Inn', 'Bree, Middle-earth', 90.00, '2025-07-15', '2025-07-20', 'A popular inn for travelers and adventurers.'),
    (uuid_generate_v4(), 'The Continental', 'Hotel', 'New York, NY', 250.00, '2025-08-05', '2025-08-10', 'A luxurious hotel known for its exclusive clientele.'),
    (uuid_generate_v4(), 'The Bates Motel', 'Motel', 'Fairvale, CA', 60.00, '2025-09-01', '2025-09-03', 'A small motel with a dark secret.'),
    (uuid_generate_v4(), 'The Green Dragon', 'Inn', 'Bywater, Shire', 70.00, '2025-10-10', '2025-10-15', 'A favorite spot for hobbits to enjoy a pint.'),
    (uuid_generate_v4(), 'The Ritz', 'Hotel', 'Paris, France', 300.00, '2025-11-20', '2025-11-25', 'A world-renowned hotel offering luxury and elegance.'),
    (uuid_generate_v4(), 'The Ice Hotel', 'Hotel', 'Jukkasjärvi, Sweden', 180.00, '2025-12-01', '2025-12-05', 'A unique hotel made entirely of ice and snow.');
