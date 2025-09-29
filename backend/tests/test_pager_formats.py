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


def test_parse_cfs_flex_ignores_location_wrapped_in_colons():
    payload = {
        "address": ": SOUTH OF RIDGE ROAD EASTERN FWY KERSBROOK",
        "message": (
            "FLEX|2025-10-01 03:45:12|1600/2/K/A|07.127|009908904|ALN|"
            "MFS: *CFSRES INC5010 01/10/25 13:15 RESPOND VEHICLE ACCIDENT, ALARM LEVEL: 1, "
            ": SOUTH OF RIDGE ROAD EASTERN FWY KERSBROOK,MAP:ADL 174 G3,TG 128, "
            "==CAR VS ROO :MTR901P_R MTR732 :"
        )
    }

    request = parse_pager_webhook_payload(payload, "cfs-flex")

    incident = request.incident
    assert incident is not None
    assert incident.address == "SOUTH OF RIDGE ROAD EASTERN FWY KERSBROOK"
    assert incident.units == "MTR901P_R MTR732"
    assert "RIDGE ROAD" not in incident.units
    assert any(detail == "Units: MTR901P_R MTR732" for detail in request.details or [])


def test_parse_cfs_flex_extracts_single_unit_after_location_block():
    payload = {
        "address": ": NORTHBOUND NEAR HAZEL ST COASTAL RD PELICAN BAY",
        "message": (
            "FLEX|2025-10-01 07:11:41|1600/2/K/A|09.031|009701704|ALN|"
            "MFS: *CFSRES INC5039 01/10/25 16:41 RESPOND VEHICLE ACCIDENT, ALARM LEVEL: 1, "
            ": NORTHBOUND NEAR HAZEL ST COASTAL RD PELICAN BAY,MAP:ADL 91 P4,TG C158 T188, "
            "==MVA - CLEAN UP REQD :SRG905 :"
        )
    }

    request = parse_pager_webhook_payload(payload, "cfs-flex")

    incident = request.incident
    assert incident is not None
    assert incident.address == "NORTHBOUND NEAR HAZEL ST COASTAL RD PELICAN BAY"
    assert incident.units == "SRG905"
    assert "NORTHBOUND" not in incident.units
    assert any(detail == "Units: SRG905" for detail in request.details or [])


def test_parse_cfs_flex_extracts_unit_block_without_location_prefix():
    payload = {
        "message": (
            "FLEX|2025-10-02 11:13:16|1600/2/K/A|03.040|009931423|ALN|"
            "MFS: *CFSRES INC5874 02/10/25 20:43 RESPOND VEHICLE ACCIDENT, ALARM LEVEL: 1, "
            "31 STUART RD BRIGHTVALE,MAP:ADL 152 K5,TG C172 T182, :WPS432 :"
        )
    }

    request = parse_pager_webhook_payload(payload, "cfs-flex")

    incident = request.incident
    assert incident is not None
    assert incident.address == "31 STUART RD BRIGHTVALE"
    assert incident.units == "WPS432"
    assert any(detail == "Units: WPS432" for detail in request.details or [])


def test_parse_cfs_flex_handles_multi_unit_assignment_with_narrative():
    payload = {
        "address": ": @OPERATIONS CENTRE 44 DEMO RD RIDGETON",
        "message": (
            "FLEX|2025-10-02 11:44:35|1600/2/K/A|11.018|009909187|ALN|"
            "MFS: *CFSRES INC5878 02/10/25 21:14 RESPOND RUBBISH OR WASTE, ALARM LEVEL: 1, "
            ": @OPERATIONS CENTRE 44 DEMO RD RIDGETON,MAP:ADL 62 G16,TG 102, "
            "==SMALL RUBBISH FIRE :AIRDESK7 SLSBC34P :"
        )
    }

    request = parse_pager_webhook_payload(payload, "cfs-flex")

    incident = request.incident
    assert incident is not None
    assert incident.address == "OPERATIONS CENTRE 44 DEMO RD RIDGETON"
    assert incident.units == "AIRDESK7 SLSBC34P"
    assert incident.narrative == "SMALL RUBBISH FIRE"
    assert any(detail == "Units: AIRDESK7 SLSBC34P" for detail in request.details or [])
