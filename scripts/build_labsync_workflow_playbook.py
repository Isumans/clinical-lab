from pathlib import Path

from build_labsync_guide import ROOT, build


SOURCE = ROOT / "docs" / "LabSync-End-to-End-Workflow-Playbook.md"
OUTPUT = ROOT / "docs" / "LabSync-End-to-End-Workflow-Playbook.docx"


if __name__ == "__main__":
    build(
        source=SOURCE,
        output=OUTPUT,
        document_title="LabSync End-to-End Workflow Playbook",
        cover_title="End-to-End Workflow\nPlaybook",
        cover_subtitle="Stages, commands, functionality, verification,\nand the meaning behind every major operation",
        cover_tagline="A practical reconstruction of how LabSync moved from local development to a secure, monitored, recoverable GCP deployment.",
    )
