# Test Experiment scheduling against the real controller

`run.py` starts the controller's real REST API (`feature/scheduler`) with an in-memory
database and a mock MQTT engine. A dev-only Vite proxy maps the lambda routes the page
calls (`/api/schedule/*`) onto the controller's `/task/*`. There is no login, no owner
check and no sensor traffic: it exercises the booking rules, clashes and availability only.

## One-time setup (PowerShell)

```powershell
# 1. Export the scheduler branch. This only reads the controller repo; it does not check anything out.
$ctrl = "$env:TEMP\specscape-controller"
New-Item -ItemType Directory -Force $ctrl | Out-Null
git -C C:\Users\jason\Documents\controller archive origin/feature/scheduler | tar -x -C $ctrl

# 2. Python environment (3.10+; the controller pins old versions, these newer ones work)
python -m venv $env:TEMP\specscape-venv
& $env:TEMP\specscape-venv\Scripts\pip install tornado croniter paho-mqtt python-dateutil pytz "PyJWT<2" dataclasses-json "websockets==10.4" avro-python3 mysql-connector-python
```

If the branch has new commits, run `git -C ...\controller fetch` first and repeat step 1.

## Every time

Terminal 1, the controller (state resets on restart):

```powershell
& $env:TEMP\specscape-venv\Scripts\python dev\controller-dev-server\run.py --src $env:TEMP\specscape-controller
```

Terminal 2, the site. Login and sensors stay mocked, scheduling goes to the controller:

```powershell
$env:VITE_USE_MOCK_API='true'
$env:VITE_USE_MOCK_SCHEDULE='false'
$env:VITE_SCHEDULE_PROXY_TARGET='http://127.0.0.1:8050'
npm run dev
```

Open <http://localhost:5173/experiment-scheduling>. The sensors in the picker are the mock ones
(serials 11259375–11259377); the controller accepts any serial.

## Notes

- The controller reports `slotSeconds` (3600 on the branch config). `--slot-seconds 900` tries 15 minutes.
- Without the proxy variable, `VITE_USE_MOCK_API=true` alone uses the in-memory mock in `src/api/scheduleMock.ts`.
- The controller's own tests also pass in this setup:
  `cd <export>\tests` then `python -c "import sys, websockets.server, unittest; sys.argv=['u','test_task_rest','test_booking','test_availability','test_task_clash']; unittest.main(module=None)"`
  with `PYTHONPATH=..\src`.
- `../lambda-handoff/ScheduleController.java` is a draft of the real lambda routes for whoever owns `lambda/serving`.
