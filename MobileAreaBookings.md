# Area bookings and mobile sensors: backend work

The Experiment Scheduling page has an **Area** tab. A user draws a rectangle
(at most 50 × 50 miles) and books the sensors inside it. The frontend is done.
This file lists the backend work needed so that the bookings behave as the UI
promises, including **mobile sensors that join while they are inside the area**.

## What the frontend sends today

`POST /task/add` (and `PUT /task/<id>`) through the lambda, unchanged from a normal booking except:

```json
{
  "sensors": ["11259375", "11259376"],
  "issuer": "jdoe",
  "start": "2026-11-20T14:00:00Z",
  "stop":  "2026-11-20T15:30:00Z",
  "parameters": {
    "command": "es_sensor",
    "minfreq": "88000000",
    "maxfreq": "108000000",
    "sslCollector": "…",
    "area": "43.01234,-89.51234,43.12345,-89.31234"
  }
}
```

- `sensors`: the **fixed** sensors inside the area that were free and online
  when the user booked. There is **no upper limit** on how many.
- `parameters.area`: `south,west,north,east` in decimal degrees, 5 decimals.
  The UI uses its presence to show the booking as an area booking and to
  re-open it in the Area tab for editing.
- The UI still requires at least one fixed sensor (see "Empty sensor list" below).

The UI also reads a new optional field from `/sensor/list`:

```json
{ "serial": 11259378, "mobile": true, "position": { "latitude": 47.37, "longitude": 8.53 } }
```

`mobile: true` sensors are drawn as blue markers at their last position. They
are never put in `sensors`; the page tells users they join automatically.

## Work items

### 1. Remove the 5-sensor cap for area bookings (needed now)

The old UI capped bookings at 5 sensors. If the lambda or the scheduler branch
of the controller enforces that, area bookings with more sensors are rejected.

- [ ] Find where the cap lives (lambda `/api/schedule/*` routes or the
      scheduler's booking rules) and skip it when `parameters.area` is set.
- [ ] Keep the cap for normal bookings.
- [ ] Optionally enforce the 50 × 50 mile limit on the server too (the UI
      enforces it, but the API should not trust the browser).

### 2. Mobile sensors report their position

- [ ] Sensor (`mqtt_sensor/sensor_manager.py` / sensor firmware): add the GPS
      fix to the `SENSORSTATUS` reply, e.g. `Latitude`, `Longitude`,
      `PositionTime` (ISO-8601). Only for sensors with GPS.
- [ ] Controller: store the last fix on `SensorInfo`
      (`base_types/sensorinfo.py`), with its timestamp.
- [ ] Mark mobile sensors (config flag or "has a GPS fix") and expose
      `mobile: true` plus the last `position` in `/sensor/list` so the map shows them.
- [ ] Treat a fix older than a few minutes (e.g. 3 status polls) as unknown,
      i.e. outside every area, so a sensor that loses GPS drops out.

### 3. The task learns about areas

- [ ] Move `area` from `parameters` to a top-level task field
      (`base_types/taskinfo.py`: parse in `from_dict`, emit in `to_dict`,
      validate 4 numbers, south < north, west < east). Accept the
      `parameters.area` form too, since existing bookings use it.
- [ ] **Empty sensor list:** today `sensors: []` means *all sensors*
      (`best_task`, `on_mqtt_task_added`, `has_collisions`). An area booking with
      no fixed sensors must not be read that way. Either forbid empty lists when
      `area` is set, or make "all sensors" an explicit flag. Once this is safe,
      tell the frontend so it can drop the "needs at least one fixed sensor" rule
      (`validate()` in `ExperimentSchedulingPage.tsx`).

### 4. Match mobile sensors to area tasks at run time

The controller already reconciles every sensor on every status poll:
`on_mqtt_sensor_status` → `best_task(sensor, tasks)` → start/stop the task if
the sensor runs something else. Hook in there.

- [ ] Extend `best_task` (`controller.py`): a task also matches a sensor when
      the sensor is mobile, the task has an `area`, and the sensor's last fresh
      fix is inside it.
- [ ] Priority: give area membership a priority one **below** normal bookings
      so a sensor booked by name always wins over an area it drives through.
      Tie between two area tasks: older task id wins.
- [ ] Hysteresis so GPS jitter at the edge doesn't start/stop the task on every
      poll: join when inside, leave only when more than ~200 m outside, or
      require two polls in a row before switching.
- [ ] Start/stop at the booking's edges: `on_mqtt_task_added` sends START/STOP
      only to the fixed `affected_sensors` captured when the task was added.
      Mobile sensors are picked up by the poll loop once the task is RUNNING
      and dropped once it is DONE. Check that the default task (id 1) is
      restored on the sensor when it leaves.
- [ ] `has_collisions` only knows fixed sensors. That is fine: mobile sensors
      are best effort and the UI says so. Don't let them cause 409s.

### 5. Data and reporting

- [ ] Store the sensor position with each measurement taken during an area
      task, so the data shows where it was recorded.
- [ ] Optional: record which mobile sensors joined a task and when (sensors
      already report `CampaignId`), and return it from `GET /task/<id>` so
      the bookings list can show it later.

### 6. Tests

- [ ] `best_task`: fixed sensor by serial; mobile sensor inside / outside /
      with a stale fix; named booking beats area; two overlapping areas.
- [ ] `taskinfo`: area parsing and validation; an area task with an empty
      sensor list is not treated as "all sensors".
- [ ] Hysteresis: a fix bouncing across the edge does not flip the task each poll.

## Things to check

- **Poll interval.** Mobile sensors join and leave only as often as
  `on_mqtt_sensor_status_poll` runs. A fast vehicle can cross a small area
  between two polls and be missed. Pick the interval with that in mind.
- **Scheduler branch.** This was written against the controller in this repo.
  The `feature/scheduler` branch (availability, slots, priorities) may have
  changed `best_task` or the task format; reconcile with it.
- **Privacy.** Showing a mobile sensor's live position on the public booking map
  may matter for sensors on private vehicles. Consider rounding the position or
  showing only "inside / outside" for sensors the user doesn't own.
