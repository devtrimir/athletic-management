<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        @font-face {
            font-family: 'Noto Sans Devanagari PDF';
            font-style: normal;
            font-weight: 400;
            src: url("{{ $fontDataUri }}") format("woff2");
        }
        @font-face {
            font-family: 'Noto Sans Devanagari PDF';
            font-style: normal;
            font-weight: 700;
            src: url("{{ $fontDataUri }}") format("woff2");
        }
        @page { size: A4 {{ $orientation }}; margin: 8mm; }
        body { font-family: 'Noto Sans Devanagari PDF', DejaVu Sans, Arial, sans-serif; font-size: 9px; color: #111827; }
        .letterhead { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 7px; margin-bottom: 8px; }
        .letterhead-title { font-size: 16px; font-weight: 700; }
        .letterhead-subtitle, .meta { font-size: 9px; color: #475569; }
        h1 { text-align: center; font-size: 15px; margin: 8px 0; }
        h2 { font-size: 11px; margin: 10px 0 5px; }
        table { width: 100%; border-collapse: collapse; table-layout: auto; margin-bottom: 8px; }
        th, td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: center; vertical-align: middle; word-wrap: break-word; }
        th { background: #f1f5f9; font-weight: 700; }
        .tier-row td { background: #e2e8f0; font-weight: 700; text-align: left; }
        .muted { color: #64748b; font-size: 8px; }
        .watermark { position: fixed; top: 38%; left: 34%; width: 32%; opacity: .055; z-index: -1; }
    </style>
</head>
<body>
    @if($logoDataUri)
        <img src="{{ $logoDataUri }}" class="watermark" alt="">
    @endif

    <div class="letterhead">
        <div class="letterhead-title">UP Police Sports Control Board (UPPSCB)</div>
        <div class="letterhead-subtitle">Uttar Pradesh Police Sports Control Board</div>
    </div>

    <h1>{{ $title }}</h1>
    <div class="meta">Printed: {{ $printedAt }}</div>

    @if(in_array('tally', $sections, true))
        @if(count($sections) > 1)<h2>Medal Tally</h2>@endif
        <table>
            <thead>
                <tr>
                    <th>Rank</th><th>Tier</th><th>Gold</th><th>Silver</th><th>Bronze</th><th>Merit</th><th>Calculated</th><th>Display only</th>
                </tr>
            </thead>
            <tbody>
                @forelse($tallyRows as $index => $row)
                    <tr>
                        <td>{{ $index + 1 }}</td>
                        <td>{{ data_get($row, 'tier.label') }}</td>
                        <td>{{ data_get($row, 'GOLD') }}</td>
                        <td>{{ data_get($row, 'SILVER') }}</td>
                        <td>{{ data_get($row, 'BRONZE') }}</td>
                        <td>{{ data_get($row, 'MERIT') }}</td>
                        <td>{{ (int) data_get($row, 'GOLD') + (int) data_get($row, 'SILVER') + (int) data_get($row, 'BRONZE') + (int) data_get($row, 'MERIT') }}</td>
                        <td>{{ data_get($row, 'display_only') }}</td>
                    </tr>
                @empty
                    <tr><td colspan="8">No data</td></tr>
                @endforelse
            </tbody>
        </table>
    @endif

    @if(in_array('detail', $sections, true))
        @if(count($sections) > 1)<h2>Medal Details</h2>@endif
        <table>
            <thead>
                <tr>
                    <th>S. No.</th><th>Medal</th><th>Athlete</th><th>PNO</th><th>Rank</th><th>Posting</th><th>Sport</th><th>Event / Weight</th><th>Tournament</th><th>Session</th>
                </tr>
            </thead>
            <tbody>
                @forelse($detailRows as $row)
                    @if(($row['type'] ?? null) === 'tier')
                        <tr class="tier-row"><td colspan="10">{{ $row['label'] }}</td></tr>
                    @else
                        <tr>
                            <td>{{ $row['serial'] }}</td>
                            @unless(data_get($row, 'skip.medal'))
                                <td rowspan="{{ data_get($row, 'rowspans.medal', 1) }}">{{ $row['medal'] }}</td>
                            @endunless
                            <td>{{ $row['athlete'] }}</td>
                            <td>{{ $row['pno'] }}</td>
                            <td>{{ $row['rank'] }}</td>
                            <td>{{ $row['posting'] }}</td>
                            @unless(data_get($row, 'skip.sport'))
                                <td rowspan="{{ data_get($row, 'rowspans.sport', 1) }}">{{ $row['sport'] }}</td>
                            @endunless
                            <td>{{ $row['event'] }}</td>
                            @unless(data_get($row, 'skip.tournament'))
                                <td rowspan="{{ data_get($row, 'rowspans.tournament', 1) }}">{!! nl2br(e($row['tournament'])) !!}</td>
                            @endunless
                            @unless(data_get($row, 'skip.session'))
                                <td rowspan="{{ data_get($row, 'rowspans.session', 1) }}">{{ $row['session'] }}</td>
                            @endunless
                        </tr>
                    @endif
                @empty
                    <tr><td colspan="10">No data</td></tr>
                @endforelse
            </tbody>
        </table>
    @endif
</body>
</html>
