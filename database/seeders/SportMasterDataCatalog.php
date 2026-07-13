<?php

declare(strict_types=1);

namespace Database\Seeders;

final class SportMasterDataCatalog
{
    /**
     * @return array<string, array{code: string, name_en: string, description: string, sort_order: int}>
     */
    public static function sports(): array
    {
        return [
            'एथलेटिक्स' => ['code' => 'ATHLETICS', 'name_en' => 'Athletics', 'description' => 'Track and field events including races, jumps, throws, and relays.', 'sort_order' => 10],
            'आर्चरी' => ['code' => 'ARCHERY', 'name_en' => 'Archery', 'description' => 'Target archery events by bow type and distance.', 'sort_order' => 20],
            'शूटिंग' => ['code' => 'SHOOTING', 'name_en' => 'Shooting', 'description' => 'Precision shooting events across rifle, pistol, and shotgun.', 'sort_order' => 30],
            'योगा' => ['code' => 'YOGA', 'name_en' => 'Yoga', 'description' => 'Individual and team judged yoga events.', 'sort_order' => 40],
            'जिम्नास्टिक' => ['code' => 'GYMNASTICS', 'name_en' => 'Gymnastics', 'description' => 'Artistic, rhythmic, and trampoline gymnastics events.', 'sort_order' => 50],
            'साइकिलिंग' => ['code' => 'CYCLING', 'name_en' => 'Cycling', 'description' => 'Road and track cycling race events.', 'sort_order' => 60],
            'क्रॉस कंट्री' => ['code' => 'CROSS_COUNTRY', 'name_en' => 'Cross Country', 'description' => 'Distance running over natural terrain.', 'sort_order' => 70],
            'पावर लिफ्टिंग' => ['code' => 'POWERLIFTING', 'name_en' => 'Powerlifting', 'description' => 'Strength events measured by lifted weight.', 'sort_order' => 80],
            'भारोत्तोलन' => ['code' => 'WEIGHTLIFTING', 'name_en' => 'Weightlifting', 'description' => 'Olympic weightlifting events measured by total lifted weight.', 'sort_order' => 90],
            'बॉडी बिल्डिंग' => ['code' => 'BODY_BUILDING', 'name_en' => 'Bodybuilding', 'description' => 'Physique and body building judged categories.', 'sort_order' => 100],
            'बैडमिंटन' => ['code' => 'BADMINTON', 'name_en' => 'Badminton', 'description' => 'Singles, doubles, and mixed doubles racket events.', 'sort_order' => 110],
            'टेबल टेनिस' => ['code' => 'TABLE_TENNIS', 'name_en' => 'Table Tennis', 'description' => 'Singles, doubles, mixed doubles, and team racket events.', 'sort_order' => 120],
            'टेनिस' => ['code' => 'TENNIS', 'name_en' => 'Tennis', 'description' => 'Singles, doubles, mixed doubles, and team tennis events.', 'sort_order' => 130],
            'स्क्वैश' => ['code' => 'SQUASH', 'name_en' => 'Squash', 'description' => 'Singles, doubles, and team squash events.', 'sort_order' => 140],
            'कुश्ती' => ['code' => 'WRESTLING', 'name_en' => 'Wrestling', 'description' => 'Freestyle and Greco-Roman combat events by weight category.', 'sort_order' => 150],
            'वुशु' => ['code' => 'WUSHU', 'name_en' => 'Wushu', 'description' => 'Sanda combat and taolu form events.', 'sort_order' => 160],
            'ताईक्वांडो' => ['code' => 'TAEKWONDO', 'name_en' => 'Taekwondo', 'description' => 'Kyorugi combat and poomsae judged events.', 'sort_order' => 170],
            'जूडो' => ['code' => 'JUDO', 'name_en' => 'Judo', 'description' => 'Combat events by weight category plus team events.', 'sort_order' => 180],
            'कराटे' => ['code' => 'KARATE', 'name_en' => 'Karate', 'description' => 'Kumite combat and kata judged events.', 'sort_order' => 190],
            'बॉक्सिंग' => ['code' => 'BOXING', 'name_en' => 'Boxing', 'description' => 'Boxing bouts by weight category.', 'sort_order' => 200],
            'आर्म रेसलिंग' => ['code' => 'ARM_WRESTLING', 'name_en' => 'Arm Wrestling', 'description' => 'Left and right arm contests by weight category.', 'sort_order' => 210],
            'मलखम्भ' => ['code' => 'MALLAKHAMB', 'name_en' => 'Mallakhamb', 'description' => 'Pole, rope, hanging, and team judged events.', 'sort_order' => 220],
            'फेंसिंग' => ['code' => 'FENCING', 'name_en' => 'Fencing', 'description' => 'Foil, epee, and sabre individual and team events.', 'sort_order' => 230],
            'हॉकी' => ['code' => 'HOCKEY', 'name_en' => 'Hockey', 'description' => 'Field hockey team match events.', 'sort_order' => 240],
            'कबड्डी' => ['code' => 'KABADDI', 'name_en' => 'Kabaddi', 'description' => 'Kabaddi team match events.', 'sort_order' => 250],
            'वॉलीबॉल' => ['code' => 'VOLLEYBALL', 'name_en' => 'Volleyball', 'description' => 'Indoor and beach volleyball team events.', 'sort_order' => 260],
            'फुटबॉल' => ['code' => 'FOOTBALL', 'name_en' => 'Football', 'description' => 'Football team match events.', 'sort_order' => 270],
            'क्रिकेट' => ['code' => 'CRICKET', 'name_en' => 'Cricket', 'description' => 'Cricket team match formats.', 'sort_order' => 280],
            'बास्केटबॉल' => ['code' => 'BASKETBALL', 'name_en' => 'Basketball', 'description' => 'Basketball team match events.', 'sort_order' => 290],
            'हैंडबॉल' => ['code' => 'HANDBALL', 'name_en' => 'Handball', 'description' => 'Handball team match events.', 'sort_order' => 300],
            'खो-खो' => ['code' => 'KHO_KHO', 'name_en' => 'Kho-Kho', 'description' => 'Kho-kho team match events.', 'sort_order' => 310],
            'रस्साकशी' => ['code' => 'TUG_OF_WAR', 'name_en' => 'Tug of War', 'description' => 'Team rope pulling events.', 'sort_order' => 320],
            'बॉल बैडमिंटन' => ['code' => 'BALL_BADMINTON', 'name_en' => 'Ball Badminton', 'description' => 'Ball badminton team match events.', 'sort_order' => 330],
            'तैराकी' => ['code' => 'SWIMMING', 'name_en' => 'Swimming', 'description' => 'Pool race, relay, and medley events.', 'sort_order' => 340],
            'वाटर पोलो' => ['code' => 'WATER_POLO', 'name_en' => 'Water Polo', 'description' => 'Water polo team match events.', 'sort_order' => 350],
            'डाइविंग' => ['code' => 'DIVING', 'name_en' => 'Diving', 'description' => 'Springboard and platform diving events.', 'sort_order' => 360],
            'कयाकिंग व केनोइंग' => ['code' => 'KAYAKING_CANOEING', 'name_en' => 'Kayaking & Canoeing', 'description' => 'Kayak and canoe sprint/slalom race events.', 'sort_order' => 370],
            'रोइंग' => ['code' => 'ROWING', 'name_en' => 'Rowing', 'description' => 'Sculls and sweep rowing crew events.', 'sort_order' => 380],
            'पेंचक सिलाट' => ['code' => 'PENCAK_SILAT', 'name_en' => 'Pencak Silat', 'description' => 'Tanding combat and seni artistic events.', 'sort_order' => 390],
            'सेपक टकरा' => ['code' => 'SEPAK_TAKRAW', 'name_en' => 'Sepak Takraw', 'description' => 'Sepak takraw regu and team events.', 'sort_order' => 400],
            'वाटर स्पोर्ट्स' => ['code' => 'WATER_SPORTS', 'name_en' => 'Water Sports', 'description' => 'Flexible umbrella category for water sport events not yet normalized separately.', 'sort_order' => 410],
        ];
    }

    /**
     * @return list<array{name: string, code: string, description: string, min_players: int|null, max_players: int|null, is_team_based: bool, is_mixed: bool, sort_order: int}>
     */
    public static function participationFormats(): array
    {
        return [
            ['name' => 'Individual', 'code' => 'INDIVIDUAL', 'description' => 'One athlete competes alone.', 'min_players' => 1, 'max_players' => 1, 'is_team_based' => false, 'is_mixed' => false, 'sort_order' => 10],
            ['name' => 'Singles', 'code' => 'SINGLES', 'description' => 'One player per side.', 'min_players' => 1, 'max_players' => 1, 'is_team_based' => false, 'is_mixed' => false, 'sort_order' => 20],
            ['name' => 'Doubles', 'code' => 'DOUBLES', 'description' => 'Two players per side.', 'min_players' => 2, 'max_players' => 2, 'is_team_based' => true, 'is_mixed' => false, 'sort_order' => 30],
            ['name' => 'Mixed Doubles', 'code' => 'MIXED_DOUBLES', 'description' => 'Two players, normally one male and one female.', 'min_players' => 2, 'max_players' => 2, 'is_team_based' => true, 'is_mixed' => true, 'sort_order' => 40],
            ['name' => 'Team', 'code' => 'TEAM', 'description' => 'Team match with defined roster size.', 'min_players' => null, 'max_players' => null, 'is_team_based' => true, 'is_mixed' => false, 'sort_order' => 50],
            ['name' => 'Mixed Team', 'code' => 'MIXED_TEAM', 'description' => 'Team match with mixed gender composition.', 'min_players' => null, 'max_players' => null, 'is_team_based' => true, 'is_mixed' => true, 'sort_order' => 60],
            ['name' => 'Relay', 'code' => 'RELAY', 'description' => 'Relay team event.', 'min_players' => 4, 'max_players' => 4, 'is_team_based' => true, 'is_mixed' => false, 'sort_order' => 70],
            ['name' => 'Pair', 'code' => 'PAIR', 'description' => 'Two-athlete pair event.', 'min_players' => 2, 'max_players' => 2, 'is_team_based' => true, 'is_mixed' => false, 'sort_order' => 80],
            ['name' => 'Squad', 'code' => 'SQUAD', 'description' => 'Squad or crew event.', 'min_players' => null, 'max_players' => null, 'is_team_based' => true, 'is_mixed' => false, 'sort_order' => 90],
            ['name' => 'Weight Category', 'code' => 'WEIGHT_CATEGORY', 'description' => 'Individual event grouped by body weight.', 'min_players' => 1, 'max_players' => 1, 'is_team_based' => false, 'is_mixed' => false, 'sort_order' => 100],
            ['name' => 'Age Category', 'code' => 'AGE_CATEGORY', 'description' => 'Event grouped by age category.', 'min_players' => 1, 'max_players' => 1, 'is_team_based' => false, 'is_mixed' => false, 'sort_order' => 110],
            ['name' => 'Open Category', 'code' => 'OPEN_CATEGORY', 'description' => 'Open category event.', 'min_players' => 1, 'max_players' => 1, 'is_team_based' => false, 'is_mixed' => false, 'sort_order' => 120],
        ];
    }

    /**
     * @return list<array{name: string, code: string, sort_order: int}>
     */
    public static function genderCategories(): array
    {
        return [
            ['name' => 'Men', 'code' => 'MEN', 'sort_order' => 10],
            ['name' => 'Women', 'code' => 'WOMEN', 'sort_order' => 20],
            ['name' => 'Mixed', 'code' => 'MIXED', 'sort_order' => 30],
            ['name' => 'Open', 'code' => 'OPEN', 'sort_order' => 40],
        ];
    }

    /**
     * @return list<array{name: string, code: string, min_age: int|null, max_age: int|null, sort_order: int}>
     */
    public static function ageCategories(): array
    {
        return [
            ['name' => 'Senior', 'code' => 'SENIOR', 'min_age' => null, 'max_age' => null, 'sort_order' => 10],
            ['name' => 'Junior', 'code' => 'JUNIOR', 'min_age' => null, 'max_age' => 20, 'sort_order' => 20],
            ['name' => 'Youth', 'code' => 'YOUTH', 'min_age' => null, 'max_age' => 18, 'sort_order' => 30],
            ['name' => 'Under 14', 'code' => 'U14', 'min_age' => null, 'max_age' => 13, 'sort_order' => 40],
            ['name' => 'Under 16', 'code' => 'U16', 'min_age' => null, 'max_age' => 15, 'sort_order' => 50],
            ['name' => 'Under 18', 'code' => 'U18', 'min_age' => null, 'max_age' => 17, 'sort_order' => 60],
            ['name' => 'Under 20', 'code' => 'U20', 'min_age' => null, 'max_age' => 19, 'sort_order' => 70],
            ['name' => 'Under 23', 'code' => 'U23', 'min_age' => null, 'max_age' => 22, 'sort_order' => 80],
            ['name' => 'Open', 'code' => 'OPEN', 'min_age' => null, 'max_age' => null, 'sort_order' => 90],
        ];
    }

    /**
     * @return list<array{name: string, code: string, symbol: string|null, sort_order: int}>
     */
    public static function measurementUnits(): array
    {
        return [
            ['name' => 'Seconds', 'code' => 'SECONDS', 'symbol' => 's', 'sort_order' => 10],
            ['name' => 'Minutes', 'code' => 'MINUTES', 'symbol' => 'min', 'sort_order' => 20],
            ['name' => 'Meters', 'code' => 'METERS', 'symbol' => 'm', 'sort_order' => 30],
            ['name' => 'Centimeters', 'code' => 'CENTIMETERS', 'symbol' => 'cm', 'sort_order' => 40],
            ['name' => 'Points', 'code' => 'POINTS', 'symbol' => 'pts', 'sort_order' => 50],
            ['name' => 'Goals', 'code' => 'GOALS', 'symbol' => 'goals', 'sort_order' => 60],
            ['name' => 'Sets', 'code' => 'SETS', 'symbol' => 'sets', 'sort_order' => 70],
            ['name' => 'Repetitions', 'code' => 'REPETITIONS', 'symbol' => 'reps', 'sort_order' => 80],
            ['name' => 'Kilograms', 'code' => 'KILOGRAMS', 'symbol' => 'kg', 'sort_order' => 90],
            ['name' => 'No Unit', 'code' => 'NO_UNIT', 'symbol' => null, 'sort_order' => 100],
        ];
    }

    /**
     * @return list<array{name: string, code: string, description: string, sort_order: int}>
     */
    public static function resultTypes(): array
    {
        return [
            ['name' => 'Time Based', 'code' => 'TIME_BASED', 'description' => 'Lower time wins.', 'sort_order' => 10],
            ['name' => 'Distance Based', 'code' => 'DISTANCE_BASED', 'description' => 'Higher distance wins.', 'sort_order' => 20],
            ['name' => 'Height Based', 'code' => 'HEIGHT_BASED', 'description' => 'Higher height wins.', 'sort_order' => 30],
            ['name' => 'Points Based', 'code' => 'POINTS_BASED', 'description' => 'Higher points win.', 'sort_order' => 40],
            ['name' => 'Goals Based', 'code' => 'GOALS_BASED', 'description' => 'Higher goals win.', 'sort_order' => 50],
            ['name' => 'Knockout', 'code' => 'KNOCKOUT', 'description' => 'Bout or contest decided by knockout, technical superiority, or decision.', 'sort_order' => 60],
            ['name' => 'Match Result', 'code' => 'MATCH_RESULT', 'description' => 'Win, loss, draw, or rank within a match format.', 'sort_order' => 70],
            ['name' => 'Set Based', 'code' => 'SET_BASED', 'description' => 'Sets or games determine the result.', 'sort_order' => 80],
            ['name' => 'Weight Lifted', 'code' => 'WEIGHT_LIFTED', 'description' => 'Higher lifted weight wins.', 'sort_order' => 90],
            ['name' => 'Rank Based', 'code' => 'RANK_BASED', 'description' => 'Judged or ranked event.', 'sort_order' => 100],
            ['name' => 'Participation Only', 'code' => 'PARTICIPATION_ONLY', 'description' => 'Participation is tracked without competitive scoring.', 'sort_order' => 110],
        ];
    }

    /**
     * @return array<string, list<array<string, mixed>>>
     */
    public static function sportEvents(): array
    {
        return [
            'ATHLETICS' => [
                self::event('100M', '100 मीटर', 'track', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'SECONDS', 'TIME_BASED'),
                self::event('200M', '200 मीटर', 'track', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'SECONDS', 'TIME_BASED'),
                self::event('400M', '400 मीटर', 'track', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'SECONDS', 'TIME_BASED'),
                self::event('800M', '800 मीटर', 'track', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'MINUTES', 'TIME_BASED'),
                self::event('1500M', '1500 मीटर', 'track', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'MINUTES', 'TIME_BASED'),
                self::event('5000M', '5000 मीटर', 'track', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'MINUTES', 'TIME_BASED'),
                self::event('10000M', '10000 मीटर', 'track', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'MINUTES', 'TIME_BASED'),
                self::event('110M_HURDLES', '110 मीटर बाधा दौड़', 'track', 'INDIVIDUAL', ['MEN'], 'SECONDS', 'TIME_BASED'),
                self::event('100M_HURDLES', '100 मीटर बाधा दौड़', 'track', 'INDIVIDUAL', ['WOMEN'], 'SECONDS', 'TIME_BASED'),
                self::event('400M_HURDLES', '400 मीटर बाधा दौड़', 'track', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'SECONDS', 'TIME_BASED'),
                self::event('LONG_JUMP', 'लंबी कूद', 'jump', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'METERS', 'DISTANCE_BASED'),
                self::event('HIGH_JUMP', 'ऊंची कूद', 'jump', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'METERS', 'HEIGHT_BASED'),
                self::event('TRIPLE_JUMP', 'त्रिकूद', 'jump', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'METERS', 'DISTANCE_BASED'),
                self::event('SHOT_PUT', 'गोला फेंक', 'throw', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'METERS', 'DISTANCE_BASED'),
                self::event('DISCUS_THROW', 'चक्का फेंक', 'throw', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'METERS', 'DISTANCE_BASED'),
                self::event('JAVELIN_THROW', 'भाला फेंक', 'throw', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'METERS', 'DISTANCE_BASED'),
                self::event('HAMMER_THROW', 'हथौड़ा फेंक', 'throw', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'METERS', 'DISTANCE_BASED'),
                self::event('4X100M_RELAY', '4x100 मीटर रिले', 'relay', 'RELAY', ['MEN', 'WOMEN'], 'SECONDS', 'TIME_BASED', min: 4, max: 4, substitutes: 2),
                self::event('4X400M_RELAY', '4x400 मीटर रिले', 'relay', 'RELAY', ['MEN', 'WOMEN', 'MIXED'], 'MINUTES', 'TIME_BASED', min: 4, max: 4, substitutes: 2, mixed: [2, 2]),
            ],
            'BADMINTON' => self::racketEvents(),
            'TABLE_TENNIS' => array_merge(self::racketEvents(), [self::event('TEAM', 'टीम', 'team', 'TEAM', ['MEN', 'WOMEN'], 'SETS', 'SET_BASED', min: 3, max: 5, substitutes: 2)]),
            'TENNIS' => array_merge(self::racketEvents(), [self::event('TEAM', 'टीम', 'team', 'TEAM', ['MEN', 'WOMEN'], 'SETS', 'SET_BASED', min: 2, max: 4, substitutes: 2)]),
            'SQUASH' => array_merge(self::racketEvents(), [self::event('TEAM', 'टीम', 'team', 'TEAM', ['MEN', 'WOMEN'], 'SETS', 'SET_BASED', min: 3, max: 5, substitutes: 2)]),
            'SWIMMING' => self::swimmingEvents(),
            'SHOOTING' => self::shootingEvents(),
            'ARCHERY' => self::archeryEvents(),
            'WRESTLING' => self::combatEvents(['FREESTYLE' => 'फ्रीस्टाइल', 'GRECO_ROMAN' => 'ग्रीको-रोमन'], 'KNOCKOUT', 'POINTS', grecoMenOnly: true),
            'BOXING' => self::combatEvents(['BOUT' => 'बाउट'], 'KNOCKOUT', 'POINTS'),
            'JUDO' => self::combatEvents(['CONTEST' => 'कॉन्टेस्ट'], 'KNOCKOUT', 'POINTS'),
            'TAEKWONDO' => array_merge(self::combatEvents(['KYORUGI' => 'क्योरुगी'], 'KNOCKOUT', 'POINTS'), [self::event('POOMSAE', 'पूमसे', 'forms', 'INDIVIDUAL', ['MEN', 'WOMEN', 'MIXED'], 'POINTS', 'RANK_BASED')]),
            'KARATE' => array_merge(self::combatEvents(['KUMITE' => 'कुमिते'], 'KNOCKOUT', 'POINTS'), [self::event('KATA', 'काता', 'forms', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED'), self::event('TEAM_KATA', 'टीम काता', 'forms', 'TEAM', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED', min: 3, max: 3, substitutes: 1)]),
            'WUSHU' => [self::event('SANDA', 'सांडा', 'combat', 'WEIGHT_CATEGORY', ['MEN', 'WOMEN'], 'POINTS', 'KNOCKOUT'), self::event('TAOLU', 'ताओलू', 'forms', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED')],
            'PENCAK_SILAT' => [self::event('TANDING', 'टैंडिंग', 'combat', 'WEIGHT_CATEGORY', ['MEN', 'WOMEN'], 'POINTS', 'KNOCKOUT'), self::event('SENI', 'सेनी', 'forms', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED')],
            'FENCING' => self::fencingEvents(),
            'POWERLIFTING' => [self::event('TOTAL', 'पावरलिफ्टिंग टोटल', 'weight', 'WEIGHT_CATEGORY', ['MEN', 'WOMEN'], 'KILOGRAMS', 'WEIGHT_LIFTED')],
            'WEIGHTLIFTING' => [self::event('TOTAL', 'भारोत्तोलन टोटल', 'weight', 'WEIGHT_CATEGORY', ['MEN', 'WOMEN'], 'KILOGRAMS', 'WEIGHT_LIFTED')],
            'BODY_BUILDING' => [self::event('PHYSIQUE', 'बॉडी बिल्डिंग', 'judged', 'WEIGHT_CATEGORY', ['MEN'], 'POINTS', 'RANK_BASED'), self::event('WOMEN_PHYSIQUE', 'विमेन फिजीक', 'judged', 'WEIGHT_CATEGORY', ['WOMEN'], 'POINTS', 'RANK_BASED')],
            'ARM_WRESTLING' => [self::event('LEFT_ARM', 'बायां हाथ', 'combat', 'WEIGHT_CATEGORY', ['MEN', 'WOMEN'], 'POINTS', 'KNOCKOUT'), self::event('RIGHT_ARM', 'दायां हाथ', 'combat', 'WEIGHT_CATEGORY', ['MEN', 'WOMEN'], 'POINTS', 'KNOCKOUT')],
            'YOGA' => [self::event('TRADITIONAL', 'ट्रेडिशनल योगासन', 'judged', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED'), self::event('ARTISTIC_SINGLE', 'आर्टिस्टिक सिंगल', 'judged', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED'), self::event('ARTISTIC_PAIR', 'आर्टिस्टिक पेयर', 'judged', 'PAIR', ['MEN', 'WOMEN', 'MIXED'], 'POINTS', 'RANK_BASED', min: 2, max: 2, mixed: [1, 1]), self::event('TEAM', 'टीम योगासन', 'judged', 'TEAM', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED', min: 5, max: 8, substitutes: 2)],
            'GYMNASTICS' => [self::event('ALL_AROUND', 'ऑल अराउंड', 'judged', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED'), self::event('FLOOR', 'फ्लोर एक्सरसाइज', 'judged', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED'), self::event('VAULT', 'वॉल्ट', 'judged', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED'), self::event('TEAM', 'टीम', 'judged', 'TEAM', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED', min: 4, max: 6, substitutes: 2)],
            'MALLAKHAMB' => [self::event('POLE', 'पोल मलखम्भ', 'judged', 'INDIVIDUAL', ['MEN'], 'POINTS', 'RANK_BASED'), self::event('ROPE', 'रोप मलखम्भ', 'judged', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED'), self::event('TEAM', 'टीम मलखम्भ', 'judged', 'TEAM', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED', min: 6, max: 8, substitutes: 2)],
            'CYCLING' => [self::event('ROAD_RACE', 'रोड रेस', 'road', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'MINUTES', 'TIME_BASED'), self::event('TIME_TRIAL', 'टाइम ट्रायल', 'road', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'MINUTES', 'TIME_BASED'), self::event('TRACK_SPRINT', 'ट्रैक स्प्रिंट', 'track', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'SECONDS', 'TIME_BASED')],
            'CROSS_COUNTRY' => [self::event('10K', '10 किमी', 'distance', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'MINUTES', 'TIME_BASED'), self::event('TEAM', 'टीम', 'distance', 'TEAM', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED', min: 4, max: 6, substitutes: 2)],
            'DIVING' => [self::event('SPRINGBOARD_1M', '1 मीटर स्प्रिंगबोर्ड', 'judged', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED'), self::event('SPRINGBOARD_3M', '3 मीटर स्प्रिंगबोर्ड', 'judged', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED'), self::event('PLATFORM_10M', '10 मीटर प्लेटफॉर्म', 'judged', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'POINTS', 'RANK_BASED')],
            'KAYAKING_CANOEING' => [self::event('K1_500M', 'K1 500 मीटर', 'sprint', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'SECONDS', 'TIME_BASED'), self::event('K2_500M', 'K2 500 मीटर', 'sprint', 'PAIR', ['MEN', 'WOMEN'], 'SECONDS', 'TIME_BASED', min: 2, max: 2), self::event('C1_500M', 'C1 500 मीटर', 'sprint', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'SECONDS', 'TIME_BASED'), self::event('C2_500M', 'C2 500 मीटर', 'sprint', 'PAIR', ['MEN', 'WOMEN'], 'SECONDS', 'TIME_BASED', min: 2, max: 2)],
            'ROWING' => [self::event('SINGLE_SCULLS', 'सिंगल स्कल्स', 'race', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'MINUTES', 'TIME_BASED'), self::event('DOUBLE_SCULLS', 'डबल स्कल्स', 'race', 'PAIR', ['MEN', 'WOMEN'], 'MINUTES', 'TIME_BASED', min: 2, max: 2), self::event('COXLESS_FOUR', 'कॉक्सलेस फोर', 'race', 'SQUAD', ['MEN', 'WOMEN'], 'MINUTES', 'TIME_BASED', min: 4, max: 4), self::event('EIGHT', 'एट', 'race', 'SQUAD', ['MEN', 'WOMEN'], 'MINUTES', 'TIME_BASED', min: 8, max: 9)],
            'WATER_SPORTS' => [self::event('OPEN_WATER_EVENT', 'ओपन वाटर इवेंट', 'flexible', 'OPEN_CATEGORY', ['OPEN'], 'NO_UNIT', 'RANK_BASED')],
            'HOCKEY' => [self::teamEvent('MATCH', 'मैच', ['MEN', 'WOMEN'], 11, 18, 7, 'GOALS_BASED')],
            'KABADDI' => [self::teamEvent('MATCH', 'मैच', ['MEN', 'WOMEN'], 7, 12, 5, 'MATCH_RESULT')],
            'VOLLEYBALL' => [self::teamEvent('INDOOR', 'इनडोर', ['MEN', 'WOMEN'], 6, 12, 6, 'SET_BASED'), self::teamEvent('BEACH', 'बीच', ['MEN', 'WOMEN'], 2, 2, 1, 'SET_BASED', 'PAIR')],
            'FOOTBALL' => [self::teamEvent('MATCH', 'मैच', ['MEN', 'WOMEN'], 11, 18, 7, 'GOALS_BASED')],
            'CRICKET' => [self::teamEvent('T20', 'टी-20', ['MEN', 'WOMEN'], 11, 15, 4, 'MATCH_RESULT'), self::teamEvent('ONE_DAY', 'वन डे', ['MEN', 'WOMEN'], 11, 15, 4, 'MATCH_RESULT')],
            'BASKETBALL' => [self::teamEvent('FIVE_A_SIDE', '5x5', ['MEN', 'WOMEN'], 5, 12, 7, 'POINTS_BASED'), self::teamEvent('THREE_A_SIDE', '3x3', ['MEN', 'WOMEN'], 3, 4, 1, 'POINTS_BASED')],
            'HANDBALL' => [self::teamEvent('MATCH', 'मैच', ['MEN', 'WOMEN'], 7, 16, 9, 'GOALS_BASED')],
            'KHO_KHO' => [self::teamEvent('MATCH', 'मैच', ['MEN', 'WOMEN'], 9, 12, 3, 'MATCH_RESULT')],
            'TUG_OF_WAR' => [self::teamEvent('STANDARD', 'स्टैंडर्ड', ['MEN', 'WOMEN', 'MIXED'], 8, 8, 2, 'MATCH_RESULT', 'TEAM', [4, 4])],
            'BALL_BADMINTON' => [self::teamEvent('FIVES', 'फाइव्स', ['MEN', 'WOMEN'], 5, 10, 5, 'SET_BASED')],
            'WATER_POLO' => [self::teamEvent('MATCH', 'मैच', ['MEN', 'WOMEN'], 7, 13, 6, 'GOALS_BASED')],
            'SEPAK_TAKRAW' => [self::teamEvent('REGU', 'रेगु', ['MEN', 'WOMEN'], 3, 5, 2, 'SET_BASED'), self::teamEvent('TEAM_REGU', 'टीम रेगु', ['MEN', 'WOMEN'], 9, 12, 3, 'SET_BASED')],
        ];
    }

    /**
     * @return array<string, list<array{name: string, code: string, gender: string|null, min: float|null, max: float|null, sort_order: int}>>
     */
    public static function weightCategories(): array
    {
        return [
            'WRESTLING' => array_merge(self::weights(['57', '61', '65', '70', '74', '79', '86', '92', '97', '125'], 'MEN'), self::weights(['50', '53', '55', '57', '59', '62', '65', '68', '72', '76'], 'WOMEN')),
            'BOXING' => array_merge(self::weights(['48', '51', '54', '57', '60', '63.5', '67', '71', '75', '80', '86', '92', '+92'], 'MEN'), self::weights(['48', '50', '52', '54', '57', '60', '63', '66', '70', '75', '81', '+81'], 'WOMEN')),
            'JUDO' => array_merge(self::weights(['60', '66', '73', '81', '90', '100', '+100'], 'MEN'), self::weights(['48', '52', '57', '63', '70', '78', '+78'], 'WOMEN')),
            'TAEKWONDO' => array_merge(self::weights(['54', '58', '63', '68', '74', '80', '87', '+87'], 'MEN'), self::weights(['46', '49', '53', '57', '62', '67', '73', '+73'], 'WOMEN')),
            'KARATE' => array_merge(self::weights(['60', '67', '75', '84', '+84'], 'MEN'), self::weights(['50', '55', '61', '68', '+68'], 'WOMEN')),
            'WUSHU' => array_merge(self::weights(['48', '52', '56', '60', '65', '70', '75', '80', '85', '+85'], 'MEN'), self::weights(['48', '52', '56', '60', '65', '70', '+70'], 'WOMEN')),
            'PENCAK_SILAT' => array_merge(self::weights(['50', '55', '60', '65', '70', '75', '80', '85'], 'MEN'), self::weights(['45', '50', '55', '60', '65', '70'], 'WOMEN')),
            'POWERLIFTING' => array_merge(self::weights(['59', '66', '74', '83', '93', '105', '120', '+120'], 'MEN'), self::weights(['47', '52', '57', '63', '69', '76', '84', '+84'], 'WOMEN')),
            'WEIGHTLIFTING' => array_merge(self::weights(['55', '61', '67', '73', '81', '89', '96', '102', '109', '+109'], 'MEN'), self::weights(['45', '49', '55', '59', '64', '71', '76', '81', '87', '+87'], 'WOMEN')),
            'BODY_BUILDING' => array_merge(self::weights(['55', '60', '65', '70', '75', '80', '85', '90', '+90'], 'MEN'), self::weights(['55', '60', '65', '+65'], 'WOMEN')),
            'ARM_WRESTLING' => array_merge(self::weights(['55', '60', '65', '70', '75', '80', '85', '90', '100', '+100'], 'MEN'), self::weights(['50', '55', '60', '65', '70', '80', '+80'], 'WOMEN')),
        ];
    }

    /**
     * @return array{code: string, name: string, discipline_type: string, format: string, genders: list<string>, unit: string, result: string, min: int|null, max: int|null, substitutes: int|null, mixed: array{0:int,1:int}|null}
     */
    private static function event(string $code, string $name, string $type, string $format, array $genders, string $unit, string $result, ?int $min = null, ?int $max = null, ?int $substitutes = null, ?array $mixed = null): array
    {
        return compact('code', 'name') + [
            'discipline_type' => $type,
            'format' => $format,
            'genders' => $genders,
            'unit' => $unit,
            'result' => $result,
            'min' => $min,
            'max' => $max,
            'substitutes' => $substitutes,
            'mixed' => $mixed,
        ];
    }

    private static function teamEvent(string $code, string $name, array $genders, int $min, int $max, int $substitutes, string $result, string $format = 'TEAM', ?array $mixed = null): array
    {
        $unit = match ($result) {
            'GOALS_BASED' => 'GOALS',
            'POINTS_BASED' => 'POINTS',
            'SET_BASED' => 'SETS',
            default => 'NO_UNIT',
        };

        return self::event($code, $name, 'team', $format, $genders, $unit, $result, $min, $max, $substitutes, $mixed);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function racketEvents(): array
    {
        return [
            self::event('SINGLES', 'एकल', 'racket', 'SINGLES', ['MEN', 'WOMEN'], 'SETS', 'SET_BASED'),
            self::event('DOUBLES', 'युगल', 'racket', 'DOUBLES', ['MEN', 'WOMEN'], 'SETS', 'SET_BASED', min: 2, max: 2),
            self::event('MIXED_DOUBLES', 'मिश्रित युगल', 'racket', 'MIXED_DOUBLES', ['MIXED'], 'SETS', 'SET_BASED', min: 2, max: 2, mixed: [1, 1]),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function swimmingEvents(): array
    {
        $events = [];
        foreach (['50M', '100M', '200M', '400M'] as $distance) {
            foreach (['FREESTYLE' => 'फ्रीस्टाइल', 'BACKSTROKE' => 'बैकस्ट्रोक', 'BREASTSTROKE' => 'ब्रेस्टस्ट्रोक', 'BUTTERFLY' => 'बटरफ्लाई'] as $strokeCode => $strokeName) {
                $events[] = self::event("{$distance}_{$strokeCode}", str_replace('M', ' मीटर', $distance).' '.$strokeName, 'swim', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'SECONDS', 'TIME_BASED');
            }
        }

        $events[] = self::event('200M_INDIVIDUAL_MEDLEY', '200 मीटर व्यक्तिगत मेडले', 'swim', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'SECONDS', 'TIME_BASED');
        $events[] = self::event('4X100M_FREESTYLE_RELAY', '4x100 मीटर फ्रीस्टाइल रिले', 'relay', 'RELAY', ['MEN', 'WOMEN', 'MIXED'], 'MINUTES', 'TIME_BASED', min: 4, max: 4, substitutes: 2, mixed: [2, 2]);

        return $events;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function shootingEvents(): array
    {
        return [
            self::event('10M_AIR_RIFLE', '10 मीटर एयर राइफल', 'rifle', 'INDIVIDUAL', ['MEN', 'WOMEN', 'MIXED'], 'POINTS', 'POINTS_BASED'),
            self::event('50M_RIFLE_3P', '50 मीटर राइफल 3 पोजीशन', 'rifle', 'INDIVIDUAL', ['MEN', 'WOMEN', 'MIXED'], 'POINTS', 'POINTS_BASED'),
            self::event('10M_AIR_PISTOL', '10 मीटर एयर पिस्टल', 'pistol', 'INDIVIDUAL', ['MEN', 'WOMEN', 'MIXED'], 'POINTS', 'POINTS_BASED'),
            self::event('25M_PISTOL', '25 मीटर पिस्टल', 'pistol', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'POINTS', 'POINTS_BASED'),
            self::event('TRAP', 'ट्रैप', 'shotgun', 'INDIVIDUAL', ['MEN', 'WOMEN', 'MIXED'], 'POINTS', 'POINTS_BASED'),
            self::event('SKEET', 'स्कीट', 'shotgun', 'INDIVIDUAL', ['MEN', 'WOMEN', 'MIXED'], 'POINTS', 'POINTS_BASED'),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function archeryEvents(): array
    {
        return [
            self::event('RECURVE_INDIVIDUAL', 'रिकर्व व्यक्तिगत', 'target', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'POINTS', 'POINTS_BASED'),
            self::event('RECURVE_TEAM', 'रिकर्व टीम', 'target', 'TEAM', ['MEN', 'WOMEN'], 'POINTS', 'POINTS_BASED', min: 3, max: 3, substitutes: 1),
            self::event('RECURVE_MIXED_TEAM', 'रिकर्व मिश्रित टीम', 'target', 'MIXED_TEAM', ['MIXED'], 'POINTS', 'POINTS_BASED', min: 2, max: 2, mixed: [1, 1]),
            self::event('COMPOUND_INDIVIDUAL', 'कंपाउंड व्यक्तिगत', 'target', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'POINTS', 'POINTS_BASED'),
            self::event('COMPOUND_TEAM', 'कंपाउंड टीम', 'target', 'TEAM', ['MEN', 'WOMEN'], 'POINTS', 'POINTS_BASED', min: 3, max: 3, substitutes: 1),
            self::event('COMPOUND_MIXED_TEAM', 'कंपाउंड मिश्रित टीम', 'target', 'MIXED_TEAM', ['MIXED'], 'POINTS', 'POINTS_BASED', min: 2, max: 2, mixed: [1, 1]),
        ];
    }

    /**
     * @param  array<string, string>  $styles
     * @return list<array<string, mixed>>
     */
    private static function combatEvents(array $styles, string $result, string $unit, bool $grecoMenOnly = false): array
    {
        $events = [];
        foreach ($styles as $code => $name) {
            $genders = $grecoMenOnly && $code === 'GRECO_ROMAN' ? ['MEN'] : ['MEN', 'WOMEN'];
            $events[] = self::event($code, $name, 'combat', 'WEIGHT_CATEGORY', $genders, $unit, $result);
        }

        return $events;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function fencingEvents(): array
    {
        $events = [];
        foreach (['FOIL' => 'फॉइल', 'EPEE' => 'एपी', 'SABRE' => 'सेबर'] as $code => $name) {
            $events[] = self::event($code, $name, 'weapon', 'INDIVIDUAL', ['MEN', 'WOMEN'], 'POINTS', 'KNOCKOUT');
            $events[] = self::event("{$code}_TEAM", "{$name} टीम", 'weapon', 'TEAM', ['MEN', 'WOMEN'], 'POINTS', 'KNOCKOUT', min: 3, max: 4, substitutes: 1);
        }

        return $events;
    }

    /**
     * @param  list<string>  $limits
     * @return list<array{name: string, code: string, gender: string, min: float|null, max: float|null, sort_order: int}>
     */
    private static function weights(array $limits, string $gender): array
    {
        $rows = [];
        $previous = null;
        foreach ($limits as $index => $limit) {
            $isPlus = str_starts_with($limit, '+');
            $value = (float) str_replace('+', '', $limit);
            $name = $isPlus ? "+{$value} kg" : "{$value} kg";
            $rows[] = [
                'name' => $name,
                'code' => ($isPlus ? 'OVER_' : 'U').str_replace('.', '_', (string) $value).'KG_'.$gender,
                'gender' => $gender,
                'min' => $isPlus ? $value : $previous,
                'max' => $isPlus ? null : $value,
                'sort_order' => ($index + 1) * 10,
            ];
            $previous = $value;
        }

        return $rows;
    }
}
