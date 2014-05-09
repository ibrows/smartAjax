smartAjax
=========

Handle smart ajax requests

Add the bundles to your `AppKernel` class

    ``` php
    // app/AppKernerl.php
    public function registerBundles()
    {
        $bundles = array(
            // ...
            new Ibrows\SmartAjaxBundle.php\IbrowsSmartAjaxBundle(),
            // ...
        );
        // ...
    }
    ```

Include JS-Lib

    ```
            {% javascripts
                'bundles/ibrowssmartajax/jquery.form.min.js'
                'bundles/ibrowssmartajax/smartajax.js'
            %}
                <script type="text/javascript" src="{{ asset_url }}"></script>
            {% endjavascripts %}
    ```
