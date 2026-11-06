package ch.electrosense.serving.controller_api;

// DRAFT, NOT COMPILED. Written against the patterns in SignalingController.java (lambda/serving, main
// branch, Spring 5). Drop it next to SignalingController and build with Maven. It is the "lambda routes"
// step of the Scheduler API walkthrough (section 7): login check, issuer from the logged-in user,
// priority locked, owner-or-admin on change/cancel. Bodies and replies otherwise pass through unchanged.
//
// Policy choices to confirm with Lance / Sumedh (marked POLICY below):
//  - non-admins see the issuer of other people's bookings replaced by "other"
//  - only the issuer or an admin may PUT / DELETE a booking

import ch.electrosense.serving.usermanager.model.LdapUser;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Experiment scheduling: authenticated front for the controller's /task API (see controller doc/Scheduling.md).
 * The controller has no authentication, so the browser must only reach it through this class.
 */
@RestController
@RequestMapping("/schedule")
public class ScheduleController {
	private static final Logger logger = LoggerFactory.getLogger(ScheduleController.class);

	private final RestTemplate rest = new RestTemplate();
	private final ObjectMapper mapper = new ObjectMapper();

	@Value("${controller.api.uri}")
	private String controllerUri;

	// ---- routes ---------------------------------------------------------------------------------

	@RequestMapping(path = "/bookings", method = RequestMethod.GET)
	public ResponseEntity<String> list(@AuthenticationPrincipal LdapUser user,
	                                   @RequestParam(value = "sensor", required = false) String sensor) {
		if (user == null) return unauthorized();
		String path = "/task/list" + (sensor != null ? "?sensor=" + encode(sensor) : "");
		ResponseEntity<String> resp = forward(HttpMethod.GET, path, null);
		if (!resp.getStatusCode().is2xxSuccessful() || user.isAdmin()) return resp;
		return hideOtherIssuers(resp, issuerOf(user)); // POLICY
	}

	@RequestMapping(path = "/bookings", method = RequestMethod.POST)
	public ResponseEntity<String> add(@AuthenticationPrincipal LdapUser user, @RequestBody String body) {
		if (user == null) return unauthorized();
		return writeTask(user, HttpMethod.POST, "/task/add", body);
	}

	@RequestMapping(path = "/bookings/{id}", method = RequestMethod.GET)
	public ResponseEntity<String> get(@AuthenticationPrincipal LdapUser user, @PathVariable("id") long id) {
		if (user == null) return unauthorized();
		ResponseEntity<String> resp = forward(HttpMethod.GET, "/task/" + id, null);
		if (!resp.getStatusCode().is2xxSuccessful() || user.isAdmin()) return resp;
		return hideOtherIssuers(resp, issuerOf(user)); // POLICY
	}

	@RequestMapping(path = "/bookings/{id}", method = RequestMethod.PUT)
	public ResponseEntity<String> update(@AuthenticationPrincipal LdapUser user, @PathVariable("id") long id,
	                                     @RequestBody String body) {
		if (user == null) return unauthorized();
		ResponseEntity<String> denied = requireOwnerOrAdmin(user, id);
		if (denied != null) return denied;
		return writeTask(user, HttpMethod.PUT, "/task/" + id, body);
	}

	@RequestMapping(path = "/bookings/{id}", method = RequestMethod.DELETE)
	public ResponseEntity<String> delete(@AuthenticationPrincipal LdapUser user, @PathVariable("id") long id) {
		if (user == null) return unauthorized();
		ResponseEntity<String> denied = requireOwnerOrAdmin(user, id);
		if (denied != null) return denied;
		return forward(HttpMethod.DELETE, "/task/" + id, null);
	}

	@RequestMapping(path = "/availability", method = RequestMethod.GET)
	public ResponseEntity<String> availability(@AuthenticationPrincipal LdapUser user,
	                                           @RequestParam Map<String, String> query) {
		if (user == null) return unauthorized();
		StringBuilder qs = new StringBuilder();
		for (String key : new String[] {"sensors", "length", "from", "priority"}) {
			if (query.containsKey(key)) {
				qs.append(qs.length() == 0 ? '?' : '&').append(key).append('=').append(encode(query.get(key)));
			}
		}
		return forward(HttpMethod.GET, "/task/availability" + qs, null);
	}

	// ---- helpers --------------------------------------------------------------------------------

	/** The controller only accepts letters, digits and _ in issuer; the React page applies the same rule. */
	private static String issuerOf(LdapUser user) {
		return user.getUsername().replaceAll("\\W", "_");
	}

	/** Fill issuer from the session and lock priority: the client must not choose either. */
	private ResponseEntity<String> writeTask(LdapUser user, HttpMethod method, String path, String body) {
		Map<String, Object> task;
		try {
			task = mapper.readValue(body, new TypeReference<Map<String, Object>>() {});
		} catch (Exception e) {
			return json(HttpStatus.BAD_REQUEST,
					"{\"message\":\"Incorrect task decleration\",\"errors\":[\"Invalid JSON for the task\"]}");
		}
		task.put("issuer", issuerOf(user));
		task.remove("priority"); // the controller then applies default_priority (5)
		task.remove("id");
		task.remove("status");
		try {
			return forward(method, path, mapper.writeValueAsString(task));
		} catch (Exception e) {
			logger.error("Could not serialise task", e);
			return json(HttpStatus.INTERNAL_SERVER_ERROR, "{\"message\":\"Server Error\"}");
		}
	}

	/** null when allowed, otherwise the reply to send. */
	private ResponseEntity<String> requireOwnerOrAdmin(LdapUser user, long id) {
		if (user.isAdmin()) return null;
		ResponseEntity<String> current = forward(HttpMethod.GET, "/task/" + id, null);
		if (!current.getStatusCode().is2xxSuccessful()) return current; // 404 etc. as the controller says
		try {
			Map<String, Object> task = mapper.readValue(current.getBody(), new TypeReference<Map<String, Object>>() {});
			if (issuerOf(user).equals(task.get("issuer"))) return null;
		} catch (Exception e) {
			logger.error("Could not read task " + id, e);
		}
		return json(HttpStatus.FORBIDDEN, "{\"message\":\"You can only change your own bookings\"}");
	}

	private ResponseEntity<String> hideOtherIssuers(ResponseEntity<String> resp, String me) {
		try {
			String body = resp.getBody();
			if (body != null && body.trim().startsWith("[")) {
				List<Map<String, Object>> tasks =
						mapper.readValue(body, new TypeReference<List<Map<String, Object>>>() {});
				List<Map<String, Object>> out = new ArrayList<>();
				for (Map<String, Object> t : tasks) out.add(maskIssuer(t, me));
				return json(HttpStatus.OK, mapper.writeValueAsString(out));
			}
			Map<String, Object> t = mapper.readValue(body, new TypeReference<Map<String, Object>>() {});
			return json(HttpStatus.OK, mapper.writeValueAsString(maskIssuer(t, me)));
		} catch (Exception e) {
			logger.error("Could not post-process task reply", e);
			return json(HttpStatus.INTERNAL_SERVER_ERROR, "{\"message\":\"Server Error\"}");
		}
	}

	private Map<String, Object> maskIssuer(Map<String, Object> task, String me) {
		Object issuer = task.get("issuer");
		if (!me.equals(issuer) && !"default".equals(issuer)) task.put("issuer", "other");
		return task;
	}

	/** Call the controller and hand its status and JSON body back unchanged (400 / 404 / 409 carry the details). */
	private ResponseEntity<String> forward(HttpMethod method, String path, String body) {
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);
		try {
			ResponseEntity<String> resp =
					rest.exchange(controllerUri + path, method, new HttpEntity<>(body, headers), String.class);
			return json(resp.getStatusCode(), resp.getBody());
		} catch (HttpStatusCodeException e) {
			return json(e.getStatusCode(), e.getResponseBodyAsString());
		} catch (RestClientException e) {
			logger.error("Controller not reachable: " + path, e);
			return json(HttpStatus.BAD_GATEWAY, "{\"message\":\"Server Error\"}");
		}
	}

	private static ResponseEntity<String> json(HttpStatus status, String body) {
		return ResponseEntity.status(status).contentType(MediaType.APPLICATION_JSON).body(body);
	}

	private static ResponseEntity<String> unauthorized() {
		return json(HttpStatus.UNAUTHORIZED, "{\"message\":\"Login required\"}");
	}

	private static String encode(String v) {
		try {
			return URLEncoder.encode(v, "UTF-8");
		} catch (UnsupportedEncodingException e) {
			return v;
		}
	}
}
