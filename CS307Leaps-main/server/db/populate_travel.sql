INSERT INTO travel (id, type, price, departure, departure_location, arrival, arrival_location)
VALUES
    (uuid_generate_v4(), 'Flight', 300.00, '2025-03-01 08:00:00', 'Los Angeles, CA', '2025-03-01 12:00:00', 'New York, NY'),
    (uuid_generate_v4(), 'Train', 100.00, '2025-04-10 09:00:00', 'Paris, France', '2025-04-10 13:00:00', 'London, UK'),
    (uuid_generate_v4(), 'Bus', 50.00, '2025-05-20 07:00:00', 'San Francisco, CA', '2025-05-20 11:00:00', 'Las Vegas, NV'),
    (uuid_generate_v4(), 'Flight', 400.00, '2025-06-01 10:00:00', 'Tokyo, Japan', '2025-06-01 18:00:00', 'Sydney, Australia'),
    (uuid_generate_v4(), 'Train', 120.00, '2025-07-15 06:00:00', 'Berlin, Germany', '2025-07-15 10:00:00', 'Munich, Germany'),
    (uuid_generate_v4(), 'Bus', 60.00, '2025-08-05 08:00:00', 'Chicago, IL', '2025-08-05 12:00:00', 'Detroit, MI'),
    (uuid_generate_v4(), 'Flight', 350.00, '2025-09-01 14:00:00', 'Miami, FL', '2025-09-01 18:00:00', 'Houston, TX'),
    (uuid_generate_v4(), 'Train', 90.00, '2025-10-10 07:00:00', 'Rome, Italy', '2025-10-10 11:00:00', 'Venice, Italy'),
    (uuid_generate_v4(), 'Bus', 40.00, '2025-11-20 09:00:00', 'Seattle, WA', '2025-11-20 13:00:00', 'Portland, OR'),
    (uuid_generate_v4(), 'Flight', 500.00, '2025-12-01 15:00:00', 'Dubai, UAE', '2025-12-01 23:00:00', 'Cape Town, South Africa');
