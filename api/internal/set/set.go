package set

type SetKey interface {
	~int | ~string
}

type Set[T SetKey] map[T]bool

func (s Set[T]) Add(key T) {
	s[key] = true
}

func (s Set[T]) Contains(key T) bool {
	_, ok := s[key]
	return ok
}

func (s Set[T]) Remove(key T) {
	delete(s, key)
}

func (s Set[T]) Len() int {
	return len(s)
}

func (s Set[T]) IsEmpty() bool {
	return len(s) == 0
}

func (s Set[T]) Keys() []T {
	keys := make([]T, s.Len())

	i := 0
	for k := range s {
		keys[i] = k
		i++
	}

	return keys
}

func (s Set[T]) Copy() Set[T] {
	copy := make(Set[T])

	for key := range s {
		copy.Add(key)
	}

	return copy
}

func Union[T SetKey](sets ...Set[T]) Set[T] {
	union := make(Set[T])

	for _, set := range sets {
		for key := range set {
			union.Add(key)
		}
	}

	return union
}

func Intersection[T SetKey](sets ...Set[T]) Set[T] {
	if len(sets) == 0 {
		return make(Set[T])
	}

	intersection := sets[0].Copy()

	for _, set := range sets[1:] {
		for key := range intersection {
			if !set.Contains(key) {
				intersection.Remove(key)
			}
		}
	}

	return intersection
}

func Difference[T SetKey](sets ...Set[T]) Set[T] {
	if len(sets) == 0 {
		return make(Set[T])
	}

	difference := sets[0].Copy()

	for _, set := range sets[1:] {
		for key := range set {
			difference.Remove(key)
		}
	}

	return difference
}

func ToSet[T SetKey](keys []T) Set[T] {
	set := make(Set[T])
	for _, key := range keys {
		set.Add(key)
	}
	return set
}
