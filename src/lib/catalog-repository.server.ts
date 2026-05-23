import {
  ANY_BARBER_OPTION,
  DEFAULT_BARBERS,
  DEFAULT_SERVICES,
  DEFAULT_SETTINGS,
  SETTINGS_DOCUMENT_ID,
  buildPublicBarberOptions,
  getActiveServices,
  normalizeAvailabilityExceptionRecord,
  normalizeBarberRecord,
  normalizeServiceRecord,
  normalizeSettingsRecord,
  sortAvailabilityExceptions,
  sortBySortOrder,
  type AppSettings,
  type AvailabilityException,
  type Barber,
  type PublicBookingCatalog,
  type ServiceItem,
} from "./booking-domain";
import {
  FirestoreNotFoundError,
  createCollectionDocument,
  deleteCollectionDocument,
  getCollectionDocument,
  getFirestoreAuthMode,
  listCollectionDocuments,
  updateCollectionDocument,
} from "./firestore-rest.server";

const FIRESTORE_ACCESS_POLICY = "allow-dev-fallback" as const;
const BARBERS_COLLECTION = "barbers";
const SERVICES_COLLECTION = "services";
const AVAILABILITY_EXCEPTIONS_COLLECTION = "availability_exceptions";
const SETTINGS_COLLECTION = "settings";

type DevCatalogState = {
  barbers: Barber[];
  services: ServiceItem[];
  availabilityExceptions: AvailabilityException[];
  settings: AppSettings;
};

let devCatalogState: DevCatalogState | undefined;

function nowIso(): string {
  return new Date().toISOString();
}

function cloneStateBarbers(barbers: Barber[]): Barber[] {
  return barbers.map((barber) => ({ ...barber }));
}

function cloneStateServices(services: ServiceItem[]): ServiceItem[] {
  return services.map((service) => ({ ...service }));
}

function cloneStateExceptions(exceptions: AvailabilityException[]): AvailabilityException[] {
  return exceptions.map((exception) => ({ ...exception }));
}

function getDevCatalogState(): DevCatalogState {
  if (!devCatalogState) {
    devCatalogState = {
      barbers: cloneStateBarbers(DEFAULT_BARBERS),
      services: cloneStateServices(DEFAULT_SERVICES),
      availabilityExceptions: [],
      settings: { ...DEFAULT_SETTINGS },
    };
  }

  return devCatalogState;
}

function shouldUseDevCatalogFallback(): boolean {
  return getFirestoreAuthMode() === "api-key-dev-fallback";
}

function withTimestamps<T extends Record<string, unknown>>(
  data: T,
  createdAt?: string,
): T & { createdAt: string; updatedAt: string } {
  const timestamp = nowIso();
  return {
    ...data,
    createdAt: createdAt || timestamp,
    updatedAt: timestamp,
  };
}

async function seedDocuments<T extends { id: string }>(
  collectionId: string,
  defaults: T[],
): Promise<void> {
  for (const item of defaults) {
    try {
      await createCollectionDocument(collectionId, withTimestamps(item), {
        accessPolicy: FIRESTORE_ACCESS_POLICY,
        operation: `${collectionId} bootstrap create`,
        documentId: item.id,
      });
    } catch (error) {
      console.error(error);
    }
  }
}

async function loadSeededCollection<T extends { id: string }>(
  collectionId: string,
  defaults: T[],
  normalize: (id: string, raw: Record<string, unknown>) => T,
  sort: (items: T[]) => T[],
): Promise<T[]> {
  try {
    const records = await listCollectionDocuments(collectionId, FIRESTORE_ACCESS_POLICY);
    if (records.length > 0) {
      return sort(records.map((record) => normalize(record.id, record.data)));
    }

    if (defaults.length > 0) {
      await seedDocuments(collectionId, defaults);
      const seeded = await listCollectionDocuments(collectionId, FIRESTORE_ACCESS_POLICY);
      if (seeded.length > 0) {
        return sort(seeded.map((record) => normalize(record.id, record.data)));
      }
    }
  } catch (error) {
    console.error(error);
  }

  return sort(defaults.map((item) => ({ ...item })));
}

export async function listBarbers(): Promise<Barber[]> {
  if (shouldUseDevCatalogFallback()) {
    return sortBySortOrder(cloneStateBarbers(getDevCatalogState().barbers));
  }

  return loadSeededCollection(
    BARBERS_COLLECTION,
    DEFAULT_BARBERS,
    (id, raw) => normalizeBarberRecord(id, raw),
    sortBySortOrder,
  );
}

export async function listServices(): Promise<ServiceItem[]> {
  if (shouldUseDevCatalogFallback()) {
    return sortBySortOrder(cloneStateServices(getDevCatalogState().services));
  }

  return loadSeededCollection(
    SERVICES_COLLECTION,
    DEFAULT_SERVICES,
    (id, raw) => normalizeServiceRecord(id, raw),
    sortBySortOrder,
  );
}

export async function listAvailabilityExceptions(): Promise<AvailabilityException[]> {
  if (shouldUseDevCatalogFallback()) {
    return sortAvailabilityExceptions(
      cloneStateExceptions(getDevCatalogState().availabilityExceptions),
    );
  }

  try {
    const records = await listCollectionDocuments(
      AVAILABILITY_EXCEPTIONS_COLLECTION,
      FIRESTORE_ACCESS_POLICY,
    );
    return sortAvailabilityExceptions(
      records.map((record) => normalizeAvailabilityExceptionRecord(record.id, record.data)),
    );
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getSettings(): Promise<AppSettings> {
  if (shouldUseDevCatalogFallback()) {
    return { ...getDevCatalogState().settings };
  }

  try {
    const record = await getCollectionDocument(
      SETTINGS_COLLECTION,
      SETTINGS_DOCUMENT_ID,
      FIRESTORE_ACCESS_POLICY,
    );
    return normalizeSettingsRecord(record.id, record.data);
  } catch (error) {
    if (!(error instanceof FirestoreNotFoundError)) {
      console.error(error);
    }

    try {
      await createCollectionDocument(SETTINGS_COLLECTION, withTimestamps({ ...DEFAULT_SETTINGS }), {
        accessPolicy: FIRESTORE_ACCESS_POLICY,
        operation: "settings bootstrap create",
        documentId: SETTINGS_DOCUMENT_ID,
      });
      const seeded = await getCollectionDocument(
        SETTINGS_COLLECTION,
        SETTINGS_DOCUMENT_ID,
        FIRESTORE_ACCESS_POLICY,
      );
      return normalizeSettingsRecord(seeded.id, seeded.data);
    } catch (seedError) {
      console.error(seedError);
      return { ...DEFAULT_SETTINGS };
    }
  }
}

export async function getPublicBookingCatalog(): Promise<PublicBookingCatalog> {
  const [barbers, services, availabilityExceptions, settings] = await Promise.all([
    listBarbers(),
    listServices(),
    listAvailabilityExceptions(),
    getSettings(),
  ]);

  return {
    services: getActiveServices(services),
    barbers: buildPublicBarberOptions(barbers),
    availabilityExceptions,
    settings,
  };
}

export async function upsertBarber(
  input: Omit<Barber, "createdAt" | "updatedAt">,
): Promise<Barber> {
  const barberId = input.id || crypto.randomUUID();

  if (shouldUseDevCatalogFallback()) {
    const state = getDevCatalogState();
    const existingIndex = state.barbers.findIndex((barber) => barber.id === barberId);
    const existing = existingIndex >= 0 ? state.barbers[existingIndex] : undefined;
    const nextBarber: Barber = {
      ...input,
      id: barberId,
      createdAt: existing?.createdAt || nowIso(),
      updatedAt: nowIso(),
    };

    if (existingIndex >= 0) {
      state.barbers[existingIndex] = nextBarber;
    } else {
      state.barbers.push(nextBarber);
    }

    return { ...nextBarber };
  }

  try {
    const existing = await getCollectionDocument(
      BARBERS_COLLECTION,
      barberId,
      FIRESTORE_ACCESS_POLICY,
    );
    const updated = await updateCollectionDocument(
      BARBERS_COLLECTION,
      barberId,
      withTimestamps(input, readCreatedAt(existing.data.createdAt)),
      {
        accessPolicy: FIRESTORE_ACCESS_POLICY,
        operation: "barber update",
      },
    );
    return normalizeBarberRecord(updated.id, updated.data);
  } catch (error) {
    if (!(error instanceof FirestoreNotFoundError)) {
      throw error;
    }

    const created = await createCollectionDocument(
      BARBERS_COLLECTION,
      withTimestamps({ ...input, id: barberId }),
      {
        accessPolicy: FIRESTORE_ACCESS_POLICY,
        operation: "barber create",
        documentId: barberId,
      },
    );
    return normalizeBarberRecord(created.id, created.data);
  }
}

export async function deleteBarber(id: string): Promise<void> {
  if (shouldUseDevCatalogFallback()) {
    const state = getDevCatalogState();
    state.barbers = state.barbers.filter((barber) => barber.id !== id);
    return;
  }

  await deleteCollectionDocument(BARBERS_COLLECTION, id, FIRESTORE_ACCESS_POLICY);
}

export async function upsertService(
  input: Omit<ServiceItem, "createdAt" | "updatedAt">,
): Promise<ServiceItem> {
  const serviceId = input.id || crypto.randomUUID();

  if (shouldUseDevCatalogFallback()) {
    const state = getDevCatalogState();
    const existingIndex = state.services.findIndex((service) => service.id === serviceId);
    const existing = existingIndex >= 0 ? state.services[existingIndex] : undefined;
    const nextService: ServiceItem = {
      ...input,
      id: serviceId,
      createdAt: existing?.createdAt || nowIso(),
      updatedAt: nowIso(),
    };

    if (existingIndex >= 0) {
      state.services[existingIndex] = nextService;
    } else {
      state.services.push(nextService);
    }

    return { ...nextService };
  }

  try {
    const existing = await getCollectionDocument(
      SERVICES_COLLECTION,
      serviceId,
      FIRESTORE_ACCESS_POLICY,
    );
    const updated = await updateCollectionDocument(
      SERVICES_COLLECTION,
      serviceId,
      withTimestamps(input, readCreatedAt(existing.data.createdAt)),
      {
        accessPolicy: FIRESTORE_ACCESS_POLICY,
        operation: "service update",
      },
    );
    return normalizeServiceRecord(updated.id, updated.data);
  } catch (error) {
    if (!(error instanceof FirestoreNotFoundError)) {
      throw error;
    }

    const created = await createCollectionDocument(
      SERVICES_COLLECTION,
      withTimestamps({ ...input, id: serviceId }),
      {
        accessPolicy: FIRESTORE_ACCESS_POLICY,
        operation: "service create",
        documentId: serviceId,
      },
    );
    return normalizeServiceRecord(created.id, created.data);
  }
}

export async function deleteService(id: string): Promise<void> {
  if (shouldUseDevCatalogFallback()) {
    const state = getDevCatalogState();
    state.services = state.services.filter((service) => service.id !== id);
    return;
  }

  await deleteCollectionDocument(SERVICES_COLLECTION, id, FIRESTORE_ACCESS_POLICY);
}

export async function upsertAvailabilityException(
  input: Omit<AvailabilityException, "createdAt" | "updatedAt">,
): Promise<AvailabilityException> {
  const exceptionId = input.id || crypto.randomUUID();

  if (shouldUseDevCatalogFallback()) {
    const state = getDevCatalogState();
    const existingIndex = state.availabilityExceptions.findIndex(
      (exception) => exception.id === exceptionId,
    );
    const existing = existingIndex >= 0 ? state.availabilityExceptions[existingIndex] : undefined;
    const nextException: AvailabilityException = {
      ...input,
      id: exceptionId,
      createdAt: existing?.createdAt || nowIso(),
      updatedAt: nowIso(),
    };

    if (existingIndex >= 0) {
      state.availabilityExceptions[existingIndex] = nextException;
    } else {
      state.availabilityExceptions.push(nextException);
    }

    return { ...nextException };
  }

  try {
    const existing = await getCollectionDocument(
      AVAILABILITY_EXCEPTIONS_COLLECTION,
      exceptionId,
      FIRESTORE_ACCESS_POLICY,
    );
    const updated = await updateCollectionDocument(
      AVAILABILITY_EXCEPTIONS_COLLECTION,
      exceptionId,
      withTimestamps(input, readCreatedAt(existing.data.createdAt)),
      {
        accessPolicy: FIRESTORE_ACCESS_POLICY,
        operation: "availability exception update",
      },
    );
    return normalizeAvailabilityExceptionRecord(updated.id, updated.data);
  } catch (error) {
    if (!(error instanceof FirestoreNotFoundError)) {
      throw error;
    }

    const created = await createCollectionDocument(
      AVAILABILITY_EXCEPTIONS_COLLECTION,
      withTimestamps({ ...input, id: exceptionId }),
      {
        accessPolicy: FIRESTORE_ACCESS_POLICY,
        operation: "availability exception create",
        documentId: exceptionId,
      },
    );
    return normalizeAvailabilityExceptionRecord(created.id, created.data);
  }
}

export async function deleteAvailabilityException(id: string): Promise<void> {
  if (shouldUseDevCatalogFallback()) {
    const state = getDevCatalogState();
    state.availabilityExceptions = state.availabilityExceptions.filter(
      (exception) => exception.id !== id,
    );
    return;
  }

  await deleteCollectionDocument(AVAILABILITY_EXCEPTIONS_COLLECTION, id, FIRESTORE_ACCESS_POLICY);
}

export async function saveSettings(
  input: Omit<AppSettings, "createdAt" | "updatedAt">,
): Promise<AppSettings> {
  if (shouldUseDevCatalogFallback()) {
    const state = getDevCatalogState();
    const nextSettings: AppSettings = {
      ...input,
      createdAt: state.settings.createdAt || nowIso(),
      updatedAt: nowIso(),
    };
    state.settings = nextSettings;
    return { ...nextSettings };
  }

  try {
    const existing = await getCollectionDocument(
      SETTINGS_COLLECTION,
      SETTINGS_DOCUMENT_ID,
      FIRESTORE_ACCESS_POLICY,
    );
    const updated = await updateCollectionDocument(
      SETTINGS_COLLECTION,
      SETTINGS_DOCUMENT_ID,
      withTimestamps(input, readCreatedAt(existing.data.createdAt)),
      {
        accessPolicy: FIRESTORE_ACCESS_POLICY,
        operation: "settings update",
      },
    );
    return normalizeSettingsRecord(updated.id, updated.data);
  } catch (error) {
    if (!(error instanceof FirestoreNotFoundError)) {
      throw error;
    }

    const created = await createCollectionDocument(
      SETTINGS_COLLECTION,
      withTimestamps({ ...input, id: SETTINGS_DOCUMENT_ID }),
      {
        accessPolicy: FIRESTORE_ACCESS_POLICY,
        operation: "settings create",
        documentId: SETTINGS_DOCUMENT_ID,
      },
    );
    return normalizeSettingsRecord(created.id, created.data);
  }
}

function readCreatedAt(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export { ANY_BARBER_OPTION };
