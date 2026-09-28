export const GLOSSARY = {
  carryingCapacity: {
    term: 'Carrying capacity (K)',
    body: 'The largest population a habitat can support over the long run, set by limited food, water, space, nesting sites or light.',
    example: 'A pond might sustain 400 frogs. Add more and some starve or fail to breed until the number falls back.',
  },
  growthRate: {
    term: 'Intrinsic growth rate (r)',
    body: 'Births minus deaths per individual per unit of time when resources are unlimited. It measures a species’ reproductive potential.',
    example: 'Bacteria can double every 20 minutes. Elephants take decades.',
    calc: 'Near zero population, N grows like N₀e^(rt), so the doubling time is ln 2 / r.',
  },
  logistic: {
    term: 'Logistic growth',
    body: 'Growth that starts almost exponentially, slows as the population crowds its habitat, and levels off at the carrying capacity. Plotted over time it makes an S shape.',
  },
  exponential: {
    term: 'Exponential growth',
    body: 'Growth where the population multiplies by the same factor in every time step, because nothing limits it. Plotted over time it makes a J shape.',
    calc: 'dN/dt = rN, so N(t) = N₀e^(rt).',
  },
  inflection: {
    term: 'Inflection point',
    body: 'The moment on the S curve where growth is fastest. Before it the curve bends upward, and after it the curve bends toward K. In the classic model it happens at exactly half of K.',
    calc: 'dN/dt = rN − rN²/K is a downward parabola in N, so its peak is at N = K/2 with height rK/4.',
  },
  resistance: {
    term: 'Environmental resistance',
    body: 'Everything that holds a population below its maximum growth rate: competition for food, disease, predators, waste build-up. It grows stronger as the population gets more crowded.',
  },
  densityDependent: {
    term: 'Density-dependent factor',
    body: 'A limit whose effect gets stronger as the population gets denser, such as competition, disease or predation. These factors produce the S curve.',
    example: 'Density-independent factors like a hurricane or a frost kill the same share whatever the density.',
  },
  equilibrium: {
    term: 'Equilibrium',
    body: 'A population size where births and deaths balance, so the population stops changing. It is stable if the population returns after being nudged away, and unstable if the population runs away from it.',
    example: 'A ball resting in a valley is in a stable equilibrium. A ball balanced on a hilltop is in an unstable one.',
  },
  negativeFeedback: {
    term: 'Negative feedback',
    body: 'A loop where change triggers its own brake. More individuals means less food each, which means fewer births, which slows growth.',
  },
  perCapita: {
    term: 'Per capita',
    body: 'Per individual. The per capita growth rate is the population’s growth divided by its size.',
    calc: '(1/N)·dN/dt = r(1 − N/K), a straight line that falls from r to 0 as N goes from 0 to K.',
  },
  timeLag: {
    term: 'Time lag',
    body: 'A delay between crowding and its effect. Animals born in good times keep breeding for years after the food starts running out, so the population keeps growing past K.',
    example: 'Deer that eat the young shrubs today feel the shortage only next winter.',
    calc: 'Hutchinson’s delayed logistic uses dN/dt = rN(1 − N(t−τ)/K). It oscillates forever once rτ > π/2.',
  },
  overshoot: {
    term: 'Overshoot',
    body: 'When a population grows beyond its carrying capacity, usually because of a time lag. It is often followed by a crash.',
  },
  stochasticity: {
    term: 'Demographic stochasticity',
    body: 'Random variation in who happens to be born or die. In a big population the luck averages out. In a small one a few unlucky days can end it.',
    example: 'If only 5 animals remain and all happen to be male, the population is doomed.',
  },
  allee: {
    term: 'Allee effect',
    body: 'When individuals do worse in very small groups: they can’t find mates, defend against predators, or keep warm together. Below a threshold A the population shrinks instead of growing.',
    example: 'Passenger pigeons bred in huge colonies. Once their flocks were thinned, the survivors stopped breeding successfully.',
  },
  mvp: {
    term: 'Minimum viable population',
    body: 'The smallest population likely to survive in the long run despite bad luck, inbreeding and Allee effects. Conservation biologists use it to set recovery goals.',
  },
  msy: {
    term: 'Maximum sustainable yield',
    body: 'The largest catch that can be taken year after year without shrinking the stock. In the logistic model it comes from holding the population at K/2, where it grows fastest.',
    calc: 'Harvesting hN moves the equilibrium to K(1 − h/r). The catch hK(1 − h/r) is largest at h = r/2, giving rK/4.',
  },
  seasons: {
    term: 'Fluctuating carrying capacity',
    body: 'Real habitats change. Summer brings more food than winter, and some years are wetter or drier. The population is always chasing a K that has already moved.',
  },
  discrete: {
    term: 'Discrete generations',
    body: 'Many insects, annual plants and fish breed once a year in a single pulse. The whole year’s growth happens at once, with no chance to adjust part way, so they can overshoot badly.',
    calc: 'The Ricker model: N(t+1) = N(t)·e^(r(1 − N(t)/K)).',
  },
  chaos: {
    term: 'Chaos',
    body: 'Behavior that follows exact rules yet never repeats and cannot be predicted far ahead, because tiny differences grow over time. A simple population model can be chaotic.',
  },
  predatorPit: {
    term: 'Predator pit',
    body: 'Predators can only eat so much, so they barely dent a large population but can wipe out a small one. If prey fall below a certain level, predators hold them there.',
    calc: 'Predation is modeled as cN/(N + H), a saturating (Holling type II) response.',
  },
}
