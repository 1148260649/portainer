package endpoints

import (
	"testing"

	portainer "github.com/portainer/portainer/api"
	"github.com/portainer/portainer/api/datastore"
	"github.com/portainer/portainer/api/internal/snapshot"
	"github.com/portainer/portainer/api/internal/testhelpers"
	"github.com/stretchr/testify/assert"
)

func setupUpdateTagsHandler(t *testing.T) (handler *Handler, teardown func()) {
	_, store, teardown := datastore.MustNewTestStore(t, true, true)

	bouncer := testhelpers.NewTestRequestBouncer()
	handler = NewHandler(bouncer, nil)
	handler.DataStore = store
	handler.ComposeStackManager = testhelpers.NewComposeStackManager()

	handler.SnapshotService, _ = snapshot.NewService("1s", store, nil, nil, nil)

	return handler, teardown
}

func Test_updateTags(t *testing.T) {

	createTags := func(handler *Handler, tagNames []string, endpointIDs []portainer.EndpointID) ([]portainer.Tag, error) {
		tags := make([]portainer.Tag, len(tagNames))
		for index, tag := range tagNames {
			tag := &portainer.Tag{
				Name:           tag,
				Endpoints:      make(map[portainer.EndpointID]bool),
				EndpointGroups: make(map[portainer.EndpointGroupID]bool),
			}
			for _, endpointID := range endpointIDs {
				tag.Endpoints[endpointID] = true
			}

			err := handler.DataStore.Tag().Create(tag)
			if err != nil {
				return nil, err
			}

			tags[index] = *tag
		}

		return tags, nil
	}

	checkTags := func(handler *Handler, is *assert.Assertions, tagIDs []portainer.TagID, endpointID portainer.EndpointID) {
		for _, tagID := range tagIDs {
			tag, err := handler.DataStore.Tag().Tag(tagID)
			is.NoError(err)

			_, ok := tag.Endpoints[endpointID]
			is.True(ok, "expected endpoint to be tagged")
		}
	}

	tagsByName := func(tags []portainer.Tag, tagNames []string) []portainer.Tag {
		result := make([]portainer.Tag, len(tagNames))
		for i, tagName := range tagNames {
			for j, tag := range tags {
				if tag.Name == tagName {
					result[i] = tags[j]
					break
				}
			}
		}

		return result
	}

	getIDs := func(tags []portainer.Tag) []portainer.TagID {
		ids := make([]portainer.TagID, len(tags))
		for i, tag := range tags {
			ids[i] = tag.ID
		}

		return ids
	}

	type testCase struct {
		title              string
		endpoint           *portainer.Endpoint
		tagNames           []string
		endpointTagNames   []string
		tagsToApply        []string
		shouldNotBeUpdated bool
	}

	testFn := func(t *testing.T, testCase testCase) {

		is := assert.New(t)
		handler, teardown := setupUpdateTagsHandler(t)
		defer teardown()

		err := handler.DataStore.Endpoint().Create(testCase.endpoint)
		is.NoError(err)

		tags, err := createTags(handler, testCase.tagNames, nil)
		is.NoError(err)

		endpointTags := tagsByName(tags, testCase.endpointTagNames)
		for _, tag := range endpointTags {
			tag.Endpoints[testCase.endpoint.ID] = true

			err = handler.DataStore.Tag().UpdateTag(tag.ID, &tag)
			is.NoError(err)
		}

		endpointTagIDs := getIDs(endpointTags)
		testCase.endpoint.TagIDs = endpointTagIDs
		err = handler.DataStore.Endpoint().UpdateEndpoint(testCase.endpoint.ID, testCase.endpoint)
		is.NoError(err)

		expectedTags := tagsByName(tags, testCase.tagsToApply)
		expectedTagIDs := make([]portainer.TagID, len(expectedTags))
		for i, tag := range expectedTags {
			expectedTagIDs[i] = tag.ID
		}

		updated, err := handler.updateEnvironmentTags(expectedTagIDs, testCase.endpoint.TagIDs, testCase.endpoint.ID)
		is.NoError(err)

		is.Equal(testCase.shouldNotBeUpdated, !updated)

		checkTags(handler, is, expectedTagIDs, testCase.endpoint.ID)
	}

	testCases := []testCase{
		{
			title:            "applying tags to an endpoint without tags",
			endpoint:         &portainer.Endpoint{},
			tagNames:         []string{"tag1", "tag2", "tag3"},
			endpointTagNames: []string{},
			tagsToApply:      []string{"tag1", "tag2", "tag3"},
		},
		{
			title:            "applying tags to an endpoint with tags",
			endpoint:         &portainer.Endpoint{},
			tagNames:         []string{"tag1", "tag2", "tag3", "tag4", "tag5", "tag6"},
			endpointTagNames: []string{"tag1", "tag2", "tag3"},
			tagsToApply:      []string{"tag4", "tag5", "tag6"},
		},
		{
			title:              "applying tags to an endpoint with tags that are already applied",
			endpoint:           &portainer.Endpoint{},
			tagNames:           []string{"tag1", "tag2", "tag3"},
			endpointTagNames:   []string{"tag1", "tag2", "tag3"},
			tagsToApply:        []string{"tag1", "tag2", "tag3"},
			shouldNotBeUpdated: true,
		},
		{
			title:            "adding new tags to an endpoint with tags ",
			endpoint:         &portainer.Endpoint{},
			tagNames:         []string{"tag1", "tag2", "tag3", "tag4", "tag5", "tag6"},
			endpointTagNames: []string{"tag1", "tag2", "tag3"},
			tagsToApply:      []string{"tag1", "tag2", "tag3", "tag4", "tag5", "tag6"},
		},
		{
			title:            "mixing tags that are already applied and new tags",
			endpoint:         &portainer.Endpoint{},
			tagNames:         []string{"tag1", "tag2", "tag3", "tag4", "tag5", "tag6"},
			endpointTagNames: []string{"tag1", "tag2", "tag3"},
			tagsToApply:      []string{"tag2", "tag4", "tag5"},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.title, func(t *testing.T) {
			testFn(t, testCase)
		})
	}
}
