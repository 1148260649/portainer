angular.module('portainer.app').controller('CodeEditorController', function CodeEditorController($document, CodeMirrorService, $scope) {
  var ctrl = this;

  $scope.$watch(
    () => ctrl.readOnly,
    () => {
      if (ctrl.editor && ctrl.editor.getValue('readOnly') !== ctrl.readOnly) {
        ctrl.editor.setOption('readOnly', ctrl.readOnly);
      }
    }
  );

  this.$onChanges = function $onChanges({ value }) {
    if (value && value.currentValue && ctrl.editor && ctrl.editor.getValue() !== value.currentValue) {
      ctrl.editor.setValue(value.currentValue);
    }

    if (ctrl.editor) {
      ctrl.editor.setOption('readOnly', ctrl.readOnly);
    }
  };

  this.$onInit = function () {
    $document.ready(function () {
      var editorElement = $document[0].getElementById(ctrl.identifier);
      ctrl.editor = CodeMirrorService.applyCodeMirrorOnElement(editorElement, ctrl.yml, ctrl.readOnly);
      if (ctrl.onChange) {
        ctrl.editor.on('change', (...args) => $scope.$evalAsync(() => ctrl.onChange(...args)));
      }
      if (ctrl.value) {
        ctrl.editor.setValue(ctrl.value);
      }
    });
  };
});
