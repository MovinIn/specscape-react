"""
Run the real SpecScape controller REST API (feature/scheduler) with an in-memory
database and a mock MQTT engine, so the Experiment scheduling page can be tested
against the actual booking rules without MySQL, MQTT, LDAP or the lambda.

    python run.py --src <path to a controller checkout/export> [--port 8050] [--slot-seconds 3600]

State is in memory only; restart to reset. Nothing is written to the controller repo.
"""
import argparse
import asyncio
import logging
import os
import sys

ap = argparse.ArgumentParser()
ap.add_argument("--src", required=True, help="controller checkout (the folder that contains src/ and schemas/)")
ap.add_argument("--port", type=int, default=8050)
ap.add_argument("--slot-seconds", type=int, default=None, help="override [scheduling] slot_seconds")
ap.add_argument("--min-length-hours", type=int, default=None)
args = ap.parse_args()

root = os.path.abspath(args.src)
sys.path.insert(0, os.path.join(root, "src"))

import websockets.server  # noqa: E402,F401  (the controller uses websockets.server without importing it)
import tornado.web  # noqa: E402

from base_types import AppState  # noqa: E402
from controller import Controller  # noqa: E402
from database.mysql import MockDatabase  # noqa: E402
from mqtt import AvroParser  # noqa: E402
from mqtt.mqttengine import MockMqttEngine  # noqa: E402
from rest import make_rest_app  # noqa: E402
from scheduling import SchedulingConfig  # noqa: E402
from signaling import Signaling  # noqa: E402


class IdAllocatingDatabase(MockDatabase):
    """MockDatabase.write_task does not return the new task id like the MySQL database does."""
    next_id = 2

    def write_task(self, tid, data):
        if tid is None:
            tid = self.next_id
            self.next_id += 1
        super().write_task(tid, data)
        return tid


async def main():
    logging.basicConfig(level=logging.INFO, format="%(name)s %(levelname)s - %(message)s")
    loop = asyncio.get_running_loop()
    database = IdAllocatingDatabase(dict(), dict(), [])
    mqtt = MockMqttEngine(AvroParser({"path": os.path.join(root, "schemas", "avro", "FullSchema.avsc")}), loop)
    signaling = Signaling(port=8300, loop=loop)
    controller = Controller(database, mqtt, signaling, "secret", state=AppState())
    await controller.init()

    section = {}
    if args.slot_seconds:
        section["slot_seconds"] = str(args.slot_seconds)
    if args.min_length_hours:
        section["min_length_hours"] = str(args.min_length_hours)
    scheduling = SchedulingConfig.from_section(section)

    app: tornado.web.Application = make_rest_app(controller, scheduling)
    app.listen(args.port, address="127.0.0.1")
    print(f"Controller REST API on http://127.0.0.1:{args.port}  (slot {scheduling.slot_seconds}s, "
          f"min {scheduling.min_length_hours}h, max {scheduling.max_length_hours}h, "
          f"{scheduling.max_sensors} sensors, default priority {scheduling.default_priority})", flush=True)
    await asyncio.Event().wait()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
