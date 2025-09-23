from datetime import datetime, timezone

from wavecap_backend.pager_formats import parse_pager_webhook_payload


def test_parse_cfs_flex_with_raw_message_only():
    payload = {
        "message": (
            "FLEX|2025-09-21 22:10:15|1600/2/K/A|02.071|001800165|ALN|"
            "MFS: *CFSRES INC0026 22/09/25 07:40 RESPOND PRIVATE ALARM, ALARM LEVEL: 1, "
            "13 LAFITTE WAY ANDREWS FARM,MAP:ADL 41 M13,TG C163 T183, ==FIRE ALARM MAIN "
            "HALLWAY :ELZ331 ELZ339 :"
        )
    }

    request = parse_pager_webhook_payload(payload, "cfs-flex")

    assert (
        request.message
        == "INC0026 – PRIVATE ALARM – 13 LAFITTE WAY ANDREWS FARM – Alarm level 1"
    )
    assert request.timestamp == datetime(2025, 9, 21, 22, 10, 15, tzinfo=timezone.utc)
    assert request.details is not None
    assert "Map: ADL 41 M13" in request.details
    assert "Talkgroup C163 T183" in request.details
    assert any(detail.startswith("Narrative: FIRE ALARM MAIN HALLWAY") for detail in request.details)
    assert any(detail.startswith("Units: ELZ331 ELZ339") for detail in request.details)
    assert request.details[-1].startswith("Raw message: FLEX|")
